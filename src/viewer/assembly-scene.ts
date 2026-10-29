// Three.js assembly scene controller. Framework-free; React talks to it via a typed API.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { AssemblyState } from '../content/assembly-state';

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<string, CameraPreset> = {
  'iso':          { position: [0.6, 0.5, 0.6],   target: [0, 0.15, 0] },
  'front':        { position: [0, 0.2, 0.8],      target: [0, 0.2, 0] },
  'front-left':   { position: [0.5, 0.25, 0.6],   target: [0, 0.2, 0] },
  'front-right':  { position: [-0.5, 0.25, 0.6],  target: [0, 0.2, 0] },
  'top':          { position: [0, 0.9, 0.1],      target: [0, 0.2, 0] },
  'lower-front':  { position: [0, -0.1, 0.7],     target: [0, 0.05, 0] },
};

const HIGHLIGHT_COLOR = new THREE.Color(0x4a9eff);
const SELECT_COLOR = new THREE.Color(0xff8e4c);
const GHOST_OPACITY = 0.12;

interface MeshRecord {
  mesh: THREE.Mesh;
  componentId: string;
  meshId: string;
  originalMaterials: THREE.Material[];
}

export type SelectHandler = (componentId: string | null, meshId: string) => void;

export class AssemblyScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private meshRecords: MeshRecord[] = [];
  private meshByComponentId = new Map<string, MeshRecord[]>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private animationId = 0;
  private needsRender = true;
  private onSelect: SelectHandler | null = null;
  private container: HTMLElement;
  private disposed = false;
  private loadingModel = false;

  constructor(container: HTMLElement) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.setClearColor(0xf8f9fa);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
    this.camera.position.set(0.6, 0.5, 0.6);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.15, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.maxDistance = 3;
    this.controls.minDistance = 0.1;
    this.controls.addEventListener('change', () => { this.needsRender = true; });
    this.controls.update();

    // Lights — neutral, clear
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1, 2, 1.5);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-1, 0.5, -0.5);
    this.scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -1, 1);
    this.scene.add(rimLight);

    // Grid
    const grid = new THREE.GridHelper(2, 20, 0xd0d0d0, 0xe8e8e8);
    grid.position.y = -0.25;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    this.scene.add(grid);

    // Events
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('resize', this.onResize);

    this.onResize();
    this.animate();
  }

  async loadModel(url: string): Promise<void> {
    if (this.loadingModel) return;
    this.loadingModel = true;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    try {
      const gltf = await loader.loadAsync(url);
      // Clear old meshes
      for (const rec of this.meshRecords) {
        this.scene.remove(rec.mesh);
      }
      this.meshRecords = [];
      this.meshByComponentId.clear();

      // Index meshes
      gltf.scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const extras = obj.userData;
        const componentId = extras?.componentId || obj.name;
        const meshId = extras?.meshId || obj.name;

        const materials = Array.isArray(obj.material) ? [...obj.material] : [obj.material];
        const rec: MeshRecord = { mesh: obj, componentId, meshId, originalMaterials: materials };
        this.meshRecords.push(rec);

        if (!this.meshByComponentId.has(componentId)) {
          this.meshByComponentId.set(componentId, []);
        }
        this.meshByComponentId.get(componentId)!.push(rec);
      });

      this.scene.add(gltf.scene);
      this.needsRender = true;
    } finally {
      this.loadingModel = false;
    }
  }

  setSelectHandler(handler: SelectHandler | null): void {
    this.onSelect = handler;
  }

  applyState(state: AssemblyState, selectedId: string | null): void {
    for (const rec of this.meshRecords) {
      const cid = rec.componentId;
      const isRemoved = state.removed.has(cid);
      const isHidden = state.hidden.has(cid);
      const isHighlighted = state.highlighted.has(cid);
      const isSelected = cid === selectedId;

      if (isRemoved || isHidden) {
        rec.mesh.visible = false;
        continue;
      }

      rec.mesh.visible = true;
      const mat = rec.mesh.material;
      const mats = Array.isArray(mat) ? mat : [mat];

      for (let i = 0; i < mats.length; i++) {
        const m = mats[i];
        if (!(m instanceof THREE.MeshStandardMaterial)) continue;

        // Reset emissive
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
        m.transparent = false;
        m.opacity = 1.0;

        if (isSelected) {
          m.emissive.copy(SELECT_COLOR);
          m.emissiveIntensity = 0.35;
        } else if (isHighlighted) {
          m.emissive.copy(HIGHLIGHT_COLOR);
          m.emissiveIntensity = 0.2;
        }
      }
    }
    this.needsRender = true;
  }

  setCamera(presetOrCustom: string | CameraPreset): void {
    const preset = typeof presetOrCustom === 'string'
      ? CAMERA_PRESETS[presetOrCustom] || CAMERA_PRESETS['iso']
      : presetOrCustom;

    this.camera.position.set(...preset.position);
    this.controls.target.set(...preset.target);
    this.controls.update();
    this.needsRender = true;
  }

  resetView(): void {
    this.setCamera('iso');
  }

  getComponentIds(): string[] {
    return [...this.meshByComponentId.keys()];
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.meshRecords.filter(r => r.mesh.visible).map(r => r.mesh),
      false
    );

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const rec = this.meshRecords.find(r => r.mesh === hit);
      if (rec && this.onSelect) {
        this.onSelect(rec.componentId, rec.meshId);
      }
    } else {
      this.onSelect?.(null, '');
    }
  };

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  };

  private animate = (): void => {
    if (this.disposed) return;
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

