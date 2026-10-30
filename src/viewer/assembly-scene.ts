// The stage controller.
//
// The model is the page here, so this class does more than display geometry:
// it flies the camera between steps, projects part positions back to screen
// space for the hotspot overlay, and reports what the pointer is over. React
// never touches Three.js directly — it talks through this API.
//
// Two kinds of change stay visibly distinct:
//   procedural removal — the step actually takes the part off
//   viewing aids       — hide, isolate, ghost, separate; the part is still fitted

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * A dark studio to reflect.
 *
 * Metal has no diffuse term: what you see in it is its surroundings. Reflecting
 * a bright white room makes every machined surface read as light grey plastic.
 * Reflecting a dark room with a few bright sources gives specular highlights
 * with deep falloff between them — which is what reads as metal.
 */
function studioEnvironment(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);

  const panel = (color: number, intensity: number, scale: [number, number, number], position: [number, number, number], lookAt = true) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    if (lookAt) mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  // Large soft key overhead, barely warm. This is the main source.
  panel(0xfff6ec, 4.6, [9, 6, 1], [1.5, 7, 2.5]);
  // Back-left rim that separates the part from the void. Kept close to neutral:
  // a saturated strip turns every machined face blue.
  panel(0xcfdef0, 3.0, [1.2, 7, 1], [-6, 1.2, -4]);
  // Narrow warm kicker from the right, for the opposite edge.
  panel(0xffc79a, 3.0, [0.9, 5, 1], [6, -0.5, -2.5]);
  // Neutral front fill, so near faces are readable rather than black.
  panel(0xa9b6c6, 1.9, [8, 5, 1], [0, 0.5, 8]);
  // Faint floor bounce.
  panel(0x47525f, 1.2, [10, 10, 1], [0, -5, 0]);

  return scene;
}

/** Where to put the camera, in the engine frame (X left, Y up, Z forward). */
const CAMERA_DIRECTIONS: Record<string, [number, number, number]> = {
  iso: [0.62, 0.42, 1],
  front: [0, 0.1, 1],
  'front-left': [0.78, 0.2, 0.8],
  'front-right': [-0.78, 0.2, 0.8],
  top: [0, 1, 0.35],
  'lower-front': [0, -0.4, 1],
};

export const CAMERA_PRESETS = Object.keys(CAMERA_DIRECTIONS);

export const CAMERA_LABELS: Record<string, string> = {
  iso: 'Three-quarter',
  front: 'Front',
  'front-left': 'Left',
  'front-right': 'Right',
  top: 'Above',
  'lower-front': 'Below',
};

const HIGHLIGHT_COLOR = new THREE.Color(0x38bdf8);
const SELECT_COLOR = new THREE.Color(0xfb923c);
const GHOST_OPACITY = 0.055;
const EXPLODE_DISTANCE = 0.16;
const FLIGHT_MS = 900;

export interface SceneView {
  removed: ReadonlySet<string>;
  hidden: ReadonlySet<string>;
  highlighted: ReadonlySet<string>;
  isolated: string | null;
  selected: string | null;
  hovered: string | null;
  explode: boolean;
}

export interface ScreenPoint {
  componentId: string;
  x: number;
  y: number;
  /** Behind other geometry, so the marker should recede. */
  occluded: boolean;
  /** Outside the frustum; the marker should be hidden entirely. */
  offscreen: boolean;
}

export type SelectHandler = (componentId: string | null) => void;
export type HoverHandler = (componentId: string | null) => void;
export type ProjectionHandler = (points: ScreenPoint[]) => void;

interface MeshRecord {
  mesh: THREE.Mesh;
  componentId: string;
  meshId: string;
  materials: THREE.MeshStandardMaterial[];
  basePosition: THREE.Vector3;
  explodeDirection: THREE.Vector3;
  centre: THREE.Vector3;
  radius: number;
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface SceneOptions {
  /** Ambient mode: slow auto-rotation, no picking. Used for the landing hero. */
  showpiece?: boolean;
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
  private container: HTMLElement;
  private disposed = false;
  private loadedLayers = new Set<string>();
  private modelCentre = new THREE.Vector3();
  private modelRadius = 0.6;
  private lastView: SceneView | null = null;
  private pointerDownAt: { x: number; y: number } | null = null;
  private environment: THREE.Texture | null = null;
  private options: SceneOptions;

  private onSelect: SelectHandler | null = null;
  private onHover: HoverHandler | null = null;
  private onProject: ProjectionHandler | null = null;
  private hotspotIds: string[] = [];
  private hovered: string | null = null;
  private framingBias = 0;

  private flight: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
    duration: number;
  } | null = null;

  constructor(container: HTMLElement, options: SceneOptions = {}) {
    this.container = container;
    this.options = options;

    // Transparent clear, so the page's own gradient shows through the canvas.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    if (!options.showpiece) {
      this.renderer.domElement.setAttribute('tabindex', '0');
      this.renderer.domElement.setAttribute('role', 'application');
      this.renderer.domElement.setAttribute(
        'aria-label',
        'Engine model. Drag to orbit, scroll to zoom, click a part to open it. Arrow keys orbit, plus and minus zoom, 0 resets the view.',
      );
    } else {
      this.renderer.domElement.setAttribute('aria-hidden', 'true');
    }
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.01, 40);
    this.camera.position.set(0.7, 0.45, 1.15);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.75;
    this.controls.addEventListener('change', () => {
      this.needsRender = true;
    });
    if (options.showpiece) {
      this.controls.enabled = false;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.45;
    }

    // The studio does most of the work; the directionals only add shape.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(studioEnvironment(), 0.03).texture;
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 1;
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xfff1dd, 1.1);
    key.position.set(0.9, 1.5, 1.2);
    this.scene.add(key);

    const coolRim = new THREE.DirectionalLight(0x8ec5ff, 0.55);
    coolRim.position.set(-1.4, 0.5, -0.9);
    this.scene.add(coolRim);

    this.scene.add(new THREE.AmbientLight(0x56657d, 0.25));

    if (!options.showpiece) {
      const canvas = this.renderer.domElement;
      canvas.addEventListener('pointerdown', this.handlePointerDown);
      canvas.addEventListener('pointerup', this.handlePointerUp);
      canvas.addEventListener('pointermove', this.handlePointerMove);
      canvas.addEventListener('pointerleave', this.handlePointerLeave);
      canvas.addEventListener('keydown', this.handleKeyDown);
    }
    window.addEventListener('resize', this.handleResize);

    this.handleResize();
    this.animate();
  }

  /** Load one asset layer additively, in the manifest's declared order. */
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
      // A node with several primitives loads as a Group with Mesh children, and
      // the glTF extras sit on the group. Climb to whichever ancestor has them.
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
        explodeDirection: new THREE.Vector3(),
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
    this.controls.minDistance = this.modelRadius * 0.22;
    this.controls.maxDistance = this.modelRadius * 6;
    for (const record of this.records) {
      record.explodeDirection = record.centre.clone().sub(this.modelCentre);
      if (record.explodeDirection.lengthSq() < 1e-8) record.explodeDirection.set(0, 0, 0.01);
      record.explodeDirection.normalize();
    }
  }

  setSelectHandler(handler: SelectHandler | null): void {
    this.onSelect = handler;
  }

  setHoverHandler(handler: HoverHandler | null): void {
    this.onHover = handler;
  }

  setProjectionHandler(handler: ProjectionHandler | null): void {
    this.onProject = handler;
  }

  /**
   * Push the subject sideways in frame, as a fraction of the viewport width.
   * The step card floats over the left of the stage, so framing the model dead
   * centre would put half of it under the card.
   */
  setFramingBias(fraction: number): void {
    if (Math.abs(fraction - this.framingBias) < 0.001) return;
    this.framingBias = fraction;
  }

  /** Shift a camera/target pair sideways so the subject clears the overlay. */
  private applyBias(position: THREE.Vector3, target: THREE.Vector3): void {
    if (!this.framingBias) return;
    const distance = position.distanceTo(target);
    const fov = (this.camera.fov * Math.PI) / 180;
    const visibleWidth = 2 * distance * Math.tan(fov / 2) * this.camera.aspect;
    const forward = target.clone().sub(position).normalize();
    const right = forward.cross(this.camera.up).normalize();
    const shift = right.multiplyScalar(-visibleWidth * this.framingBias);
    position.add(shift);
    target.add(shift);
  }

  /** Which components should get a screen-space marker. */
  setHotspots(componentIds: readonly string[]): void {
    this.hotspotIds = [...componentIds];
    this.needsRender = true;
    this.project();
  }

  hasComponent(componentId: string): boolean {
    return this.byComponent.has(componentId);
  }

  loadedComponentIds(): string[] {
    return [...this.byComponent.keys()];
  }

  /** Apply the full scene state. Pure in the state: same view, same scene. */
  applyView(view: SceneView): void {
    this.lastView = view;
    for (const record of this.records) {
      const id = record.componentId;
      if (view.removed.has(id) || view.hidden.has(id)) {
        record.mesh.visible = false;
        continue;
      }
      record.mesh.visible = true;

      const ghosted = view.isolated !== null && view.isolated !== id;
      const selected = view.selected === id;
      const hovered = view.hovered === id;
      const highlighted = view.highlighted.has(id);

      for (const material of record.materials) {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
        if (ghosted) {
          material.transparent = true;
          material.opacity = GHOST_OPACITY;
          material.depthWrite = false;
        } else {
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          if (selected) {
            material.emissive.copy(SELECT_COLOR);
            material.emissiveIntensity = 0.55;
          } else if (hovered) {
            material.emissive.copy(HIGHLIGHT_COLOR);
            material.emissiveIntensity = 0.42;
          } else if (highlighted) {
            material.emissive.copy(HIGHLIGHT_COLOR);
            material.emissiveIntensity = 0.3;
          }
        }
        material.needsUpdate = true;
      }

      const distance = view.explode ? EXPLODE_DISTANCE : 0;
      record.mesh.position.copy(record.basePosition).addScaledVector(record.explodeDirection, distance);
    }
    this.needsRender = true;
    this.project();
  }

  /**
   * Move the camera to a preset, framing `focusComponentIds` if given. The move
   * is animated unless `instant`, because a cut between steps loses the
   * relationship between what you were looking at and what you are now.
   */
  flyTo(preset: string, focusComponentIds: readonly string[] = [], instant = false): void {
    const direction = CAMERA_DIRECTIONS[preset] ?? CAMERA_DIRECTIONS.iso;
    const focus = this.focusBounds(focusComponentIds);
    const fov = (this.camera.fov * Math.PI) / 180;
    const distance = Math.max(0.22, (focus.radius / Math.sin(fov / 2)) * 1.08);
    const destination = new THREE.Vector3(...direction).normalize().multiplyScalar(distance).add(focus.centre);
    const lookAt = focus.centre.clone();
    this.applyBias(destination, lookAt);

    if (instant || this.options.showpiece) {
      this.camera.position.copy(destination);
      this.controls.target.copy(lookAt);
      this.controls.update();
      this.needsRender = true;
      this.project();
      return;
    }

    this.flight = {
      from: this.camera.position.clone(),
      to: destination,
      fromTarget: this.controls.target.clone(),
      toTarget: lookAt,
      start: performance.now(),
      duration: FLIGHT_MS,
    };
    this.needsRender = true;
  }

  /** Fly to one component, close in. Used when a part is opened from the list. */
  focusComponent(componentId: string): void {
    const records = this.byComponent.get(componentId);
    if (!records?.length) return;
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    const focus = this.focusBounds([componentId]);
    const fov = (this.camera.fov * Math.PI) / 180;
    const distance = Math.max(0.16, (focus.radius / Math.sin(fov / 2)) * 1.0);
    const destination = direction.multiplyScalar(distance).add(focus.centre);
    const lookAt = focus.centre.clone();
    this.applyBias(destination, lookAt);
    this.flight = {
      from: this.camera.position.clone(),
      to: destination,
      fromTarget: this.controls.target.clone(),
      toTarget: lookAt,
      start: performance.now(),
      duration: FLIGHT_MS * 0.7,
    };
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
    // Keep enough of the surrounding engine in frame to stay oriented.
    const radius = Math.max(
      box.getBoundingSphere(new THREE.Sphere()).radius * 1.75,
      this.modelRadius * 0.42,
    );
    return { centre, radius };
  }

  resetView(): void {
    this.flyTo('iso');
  }

  /** Project hotspot anchors to screen space for the DOM overlay. */
  private project(): void {
    if (!this.onProject || !this.hotspotIds.length) {
      this.onProject?.([]);
      return;
    }
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const points: ScreenPoint[] = [];
    for (const componentId of this.hotspotIds) {
      const records = (this.byComponent.get(componentId) ?? []).filter((record) => record.mesh.visible);
      if (!records.length) continue;

      // Anchor on the largest visible mesh of the component.
      const anchorRecord = records.reduce((best, record) => (record.radius > best.radius ? record : best));
      const anchor = anchorRecord.centre
        .clone()
        .addScaledVector(anchorRecord.explodeDirection, this.lastView?.explode ? EXPLODE_DISTANCE : 0);

      const projected = anchor.clone().project(this.camera);
      const offscreen = projected.z > 1 || Math.abs(projected.x) > 1.25 || Math.abs(projected.y) > 1.25;

      let occluded = false;
      if (!offscreen) {
        const toAnchor = anchor.clone().sub(this.camera.position);
        const distance = toAnchor.length();
        this.raycaster.set(this.camera.position, toAnchor.normalize());
        this.raycaster.far = distance - 0.004;
        const blockers = this.raycaster.intersectObjects(
          this.records.filter((record) => record.mesh.visible && record.componentId !== componentId).map((r) => r.mesh),
          false,
        );
        occluded = blockers.length > 0;
        this.raycaster.far = Infinity;
      }

      points.push({
        componentId,
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        occluded,
        offscreen,
      });
    }
    this.onProject(points);
  }

  private pickAt(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const candidates = this.records.filter((record) => record.mesh.visible).map((record) => record.mesh);
    const hits = this.raycaster.intersectObjects(candidates, false);
    if (!hits.length) return null;
    return this.records.find((entry) => entry.mesh === hits[0].object)?.componentId ?? null;
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
    if (!this.onHover || event.pointerType === 'touch' || this.pointerDownAt) return;
    const pick = this.pickAt(event.clientX, event.clientY);
    this.renderer.domElement.style.cursor = pick ? 'pointer' : 'grab';
    if (pick === this.hovered) return;
    this.hovered = pick;
    this.onHover(pick);
  };

  private handlePointerLeave = (): void => {
    if (this.hovered === null) return;
    this.hovered = null;
    this.onHover?.(null);
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
    this.flight = null;
  };

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.needsRender = true;
    this.project();
  };

  /** Call after a layout change that resizes the container. */
  refresh(): void {
    this.handleResize();
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);

    if (this.flight) {
      const elapsed = (performance.now() - this.flight.start) / this.flight.duration;
      const t = easeInOutCubic(Math.min(1, elapsed));
      this.camera.position.lerpVectors(this.flight.from, this.flight.to, t);
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, t);
      if (elapsed >= 1) this.flight = null;
      this.needsRender = true;
    }

    if (this.controls.update()) this.needsRender = true;
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
      this.project();
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
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
