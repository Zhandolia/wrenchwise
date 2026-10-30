// Three.js assembly controller. Framework-free; React talks to it through this
// typed API. Blender and modeling/wrenchwise build the geometry; this file only
// displays and controls it.
//
// Two kinds of change are rendered differently and must not be confused:
//   * procedural removal (a step actually takes the part off) — the mesh is gone
//   * viewing aids (hide, ghost, isolate, explode) — the part is still fitted
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Direction to place the camera, in the engine frame (X left, Y up, Z forward). */
const CAMERA_DIRECTIONS: Record<string, [number, number, number]> = {
  iso: [0.62, 0.5, 1],
  front: [0, 0.12, 1],
  'front-left': [0.75, 0.22, 0.85],
  'front-right': [-0.75, 0.22, 0.85],
  top: [0, 1, 0.3],
  'lower-front': [0, -0.45, 1],
};

export const CAMERA_PRESETS = Object.keys(CAMERA_DIRECTIONS);

const HIGHLIGHT_COLOR = new THREE.Color(0x1d6fd0);
const SELECT_COLOR = new THREE.Color(0xc2410c);
const GHOST_OPACITY = 0.1;
const EXPLODE_DISTANCE = 0.14;

export interface SceneView {
  /** Procedurally removed by the steps so far. */
  removed: ReadonlySet<string>;
  /** Hidden as a viewing aid for this step. */
  hidden: ReadonlySet<string>;
  highlighted: ReadonlySet<string>;
  camera: string;
  explode: boolean;
  /** When set, everything else is ghosted. */
  isolated: string | null;
  selected: string | null;
}

export interface ComponentPick {
  componentId: string;
  meshId: string;
}

export type SelectHandler = (pick: ComponentPick | null) => void;
export type HoverHandler = (pick: ComponentPick | null) => void;

interface MeshRecord {
  mesh: THREE.Mesh;
  componentId: string;
  meshId: string;
  materials: THREE.MeshStandardMaterial[];
  basePosition: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  centre: THREE.Vector3;
  radius: number;
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

export class AssemblyScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private records: MeshRecord[] = [];
  private byComponent = new Map<string, MeshRecord[]>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private frame = 0;
  private needsRender = true;
  private onSelect: SelectHandler | null = null;
  private onHover: HoverHandler | null = null;
  private container: HTMLElement;
  private disposed = false;
  private loadedLayers = new Set<string>();
  private modelCentre = new THREE.Vector3();
  private modelRadius = 0.6;
  private lastView: SceneView | null = null;
  private pointerDownAt: { x: number; y: number } | null = null;
  private environment: THREE.Texture | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.setClearColor(0xf7f8fa);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.setAttribute('role', 'application');
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Engine assembly. Drag to orbit, scroll to zoom, click a part to select it. Arrow keys orbit, plus and minus zoom, 0 resets the view.',
    );
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 40);
    this.camera.position.set(0.7, 0.5, 1.1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener('change', () => {
      this.needsRender = true;
    });

    // A neutral studio environment. Metal has no diffuse term, so without an
    // environment every metallic part renders black; this is what makes the
    // silver finishes read as metal rather than as shadow.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.environment;
    pmrem.dispose();

    // Directional light on top of it, for shape readability. No coloured rim,
    // so material contrast reads as material.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.8, 1.6, 1.4);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-1.2, 0.4, 0.6);
    this.scene.add(fill);
    const under = new THREE.DirectionalLight(0xffffff, 0.35);
    under.position.set(0, -1, 0.4);
    this.scene.add(under);

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);

    this.handleResize();
    this.animate();
  }

  /**
   * Load one asset layer additively. Call with the core layer first, then the
   * access layer, so the timing drive is interactive before the rest arrives.
   */
  async loadLayer(layer: string, url: string): Promise<void> {
    if (this.loadedLayers.has(layer)) return;
    this.loadedLayers.add(layer);
    let gltf;
    try {
      gltf = await new GLTFLoader().loadAsync(url);
    } catch (error) {
      this.loadedLayers.delete(layer);
      throw error;
    }
    if (this.disposed) return;

    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      // A node with several primitives (one per material) loads as a Group with
      // Mesh children, and the glTF extras sit on the group. Climb to whichever
      // ancestor carries them.
      let holder: THREE.Object3D | null = object;
      while (holder && !(holder.userData as { componentId?: string })?.componentId) {
        holder = holder.parent;
      }
      const extras = ((holder ?? object).userData ?? {}) as { componentId?: string; meshId?: string };
      const componentId = extras.componentId ?? object.name;
      const meshId = extras.meshId ?? object.name;

      // Clone materials per mesh: the export shares material definitions, and
      // highlighting must not leak across components.
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const materials = source.map((material) => (material as THREE.MeshStandardMaterial).clone());
      object.material = materials.length === 1 ? materials[0] : materials;

      object.geometry.computeBoundingSphere();
      const sphere = object.geometry.boundingSphere;
      object.updateWorldMatrix(true, false);
      const centre = sphere
        ? sphere.center.clone().applyMatrix4(object.matrixWorld)
        : new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);

      const record: MeshRecord = {
        mesh: object,
        componentId,
        meshId,
        materials,
        basePosition: object.position.clone(),
        explodeOffset: new THREE.Vector3(),
        centre,
        radius: sphere?.radius ?? 0.05,
      };
      this.records.push(record);
      const list = this.byComponent.get(componentId);
      if (list) list.push(record);
      else this.byComponent.set(componentId, [record]);
    });

    this.scene.add(gltf.scene);
    this.recomputeBounds();
    if (this.lastView) this.applyView(this.lastView);
    this.needsRender = true;
  }

  private recomputeBounds(): void {
    const box = new THREE.Box3();
    for (const record of this.records) {
      box.expandByPoint(record.centre.clone().addScalar(-record.radius));
      box.expandByPoint(record.centre.clone().addScalar(record.radius));
    }
    if (box.isEmpty()) return;
    box.getCenter(this.modelCentre);
    this.modelRadius = Math.max(0.2, box.getBoundingSphere(new THREE.Sphere()).radius);
    this.controls.minDistance = this.modelRadius * 0.25;
    this.controls.maxDistance = this.modelRadius * 6;
    for (const record of this.records) {
      record.explodeOffset = record.centre.clone().sub(this.modelCentre);
      if (record.explodeOffset.lengthSq() < 1e-8) record.explodeOffset.set(0, 0, 0.01);
      record.explodeOffset.normalize();
    }
  }

  setSelectHandler(handler: SelectHandler | null): void {
    this.onSelect = handler;
  }

  setHoverHandler(handler: HoverHandler | null): void {
    this.onHover = handler;
  }

  loadedComponentIds(): string[] {
    return [...this.byComponent.keys()];
  }

  /** Apply the full scene state. Pure in the state: same view, same scene. */
  applyView(view: SceneView): void {
    this.lastView = view;
    for (const record of this.records) {
      const id = record.componentId;
      const gone = view.removed.has(id) || view.hidden.has(id);
      if (gone) {
        record.mesh.visible = false;
        continue;
      }
      record.mesh.visible = true;

      const isolatedAway = view.isolated !== null && view.isolated !== id;
      const selected = view.selected === id;
      const highlighted = view.highlighted.has(id);

      for (const material of record.materials) {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        if (isolatedAway) {
          material.transparent = true;
          material.opacity = GHOST_OPACITY;
          material.depthWrite = false;
        } else {
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          if (selected) {
            material.emissive.copy(SELECT_COLOR);
            material.emissiveIntensity = 0.42;
          } else if (highlighted) {
            material.emissive.copy(HIGHLIGHT_COLOR);
            material.emissiveIntensity = 0.26;
          }
        }
        material.needsUpdate = true;
      }

      const distance = view.explode ? EXPLODE_DISTANCE : 0;
      record.mesh.position.copy(record.basePosition).addScaledVector(record.explodeOffset, distance);
    }
    this.needsRender = true;
  }

  /**
   * Frame the model. When `focusComponentIds` is given, the camera targets the
   * bounds of those components, so a step's parts fill the view.
   */
  setCamera(preset: string, focusComponentIds: readonly string[] = []): void {
    const direction = CAMERA_DIRECTIONS[preset] ?? CAMERA_DIRECTIONS.iso;
    const focus = this.focusBounds(focusComponentIds);
    const fov = (this.camera.fov * Math.PI) / 180;
    const distance = Math.max(0.25, (focus.radius / Math.sin(fov / 2)) * 1.5);
    const offset = new THREE.Vector3(...direction).normalize().multiplyScalar(distance);
    this.camera.position.copy(focus.centre).add(offset);
    this.controls.target.copy(focus.centre);
    this.controls.update();
    this.needsRender = true;
  }

  private focusBounds(componentIds: readonly string[]): { centre: THREE.Vector3; radius: number } {
    const box = new THREE.Box3();
    let found = 0;
    for (const id of componentIds) {
      for (const record of this.byComponent.get(id) ?? []) {
        if (!record.mesh.visible) continue;
        box.expandByPoint(record.centre.clone().addScalar(-record.radius));
        box.expandByPoint(record.centre.clone().addScalar(record.radius));
        found++;
      }
    }
    if (!found || box.isEmpty()) {
      return { centre: this.modelCentre.clone(), radius: this.modelRadius };
    }
    const centre = box.getCenter(new THREE.Vector3());
    // Keep enough of the surrounding engine in frame to stay oriented, however
    // small the step's parts are.
    const radius = Math.max(
      box.getBoundingSphere(new THREE.Sphere()).radius * 1.6,
      this.modelRadius * 0.38,
    );
    return { centre, radius };
  }

  resetView(): void {
    this.setCamera('iso');
  }

  private pickAt(clientX: number, clientY: number): ComponentPick | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates = this.records.filter((record) => record.mesh.visible).map((record) => record.mesh);
    const hits = this.raycaster.intersectObjects(candidates, false);
    if (!hits.length) return null;
    const record = this.records.find((entry) => entry.mesh === hits[0].object);
    return record ? { componentId: record.componentId, meshId: record.meshId } : null;
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.pointerDownAt) return;
    const moved = Math.hypot(event.clientX - this.pointerDownAt.x, event.clientY - this.pointerDownAt.y);
    this.pointerDownAt = null;
    // An orbit drag is not a selection.
    if (moved > 6) return;
    this.onSelect?.(this.pickAt(event.clientX, event.clientY));
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.onHover || event.pointerType === 'touch') return;
    const pick = this.pickAt(event.clientX, event.clientY);
    this.renderer.domElement.style.cursor = pick ? 'pointer' : 'grab';
    this.onHover(pick);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const orbit = (dTheta: number, dPhi: number) => {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += dTheta;
      spherical.phi = Math.max(0.08, Math.min(Math.PI - 0.08, spherical.phi + dPhi));
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      this.controls.update();
      this.needsRender = true;
    };
    const zoom = (factor: number) => {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const length = THREE.MathUtils.clamp(
        offset.length() * factor,
        this.controls.minDistance,
        this.controls.maxDistance,
      );
      this.camera.position.copy(this.controls.target).add(offset.setLength(length));
      this.controls.update();
      this.needsRender = true;
    };
    const step = 0.16;
    switch (event.key) {
      case 'ArrowLeft': orbit(-step, 0); break;
      case 'ArrowRight': orbit(step, 0); break;
      case 'ArrowUp': orbit(0, -step); break;
      case 'ArrowDown': orbit(0, step); break;
      case '+': case '=': zoom(0.85); break;
      case '-': case '_': zoom(1.18); break;
      case '0': this.resetView(); break;
      case 'Escape': this.onSelect?.(null); break;
      default: return;
    }
    event.preventDefault();
  };

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.needsRender = true;
  };

  /** Call after a layout change that resizes the container. */
  refresh(): void {
    this.handleResize();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (this.controls.update()) this.needsRender = true;
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    for (const record of this.records) {
      record.mesh.geometry.dispose();
      for (const material of record.materials) material.dispose();
    }
    this.environment?.dispose();
    this.renderer.dispose();
    canvas.parentElement?.removeChild(canvas);
  }
}
