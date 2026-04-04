import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import type { AppStore, RenderEffects } from "../types/types.ts";
import { downloadBlob } from "../utilities/fileHelpers.ts";
import { EXCLUDE_AO_LAYER, MAP_SIZE } from "./constants.ts";

export const frustumSize = 8_000;
const readSS = () => JSON.parse(sessionStorage.getItem("camera") || "null");
const writeSS = (data: {
  position: number[];
  lookAt: number[];
  zoom: number;
}) => sessionStorage.setItem("camera", JSON.stringify(data));
const saved = readSS() || {};
const startPosition = saved.position || [0, 3000, 0];
const startLookAt = saved.lookAt || [0, 0, 0];

export class Map3DBase {
  protected readonly scene: THREE.Scene;
  protected readonly camera: THREE.OrthographicCamera;
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly composer: EffectComposer;
  protected readonly controls: MapControls;
  protected readonly store: AppStore;
  private readonly unsubscribe: () => void;
  private cameraAspectRatio: number = 1;
  private cameraPosition: THREE.Vector3 = new THREE.Vector3(...startPosition);
  private cameraLookAt: THREE.Vector3 = new THREE.Vector3(...startLookAt);
  private cameraZoom: number = saved.zoom || 1;
  private onZoomChangeListeners: ((zoom: number) => void)[] = [];

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    this.store = store;
    this.unsubscribe = store.subscribe(() => this.render());

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172b);

    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.cameraAspectRatio = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * this.cameraAspectRatio) / -2,
      (frustumSize * this.cameraAspectRatio) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      5_000,
    );
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraLookAt);
    this.camera.zoom = this.cameraZoom;
    this.camera.updateProjectionMatrix();

    this.controls = new MapControls(this.camera, canvas);
    this.controls.addEventListener("change", () =>
      requestAnimationFrame(() => this.render()),
    );
    this.controls.addEventListener("change", this.zoomChanged);
    this.controls.target.copy(this.cameraLookAt);
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10_000;
    this.controls.maxPolarAngle = Math.PI / 2;

    const ambient = new THREE.AmbientLight(0x404040, 0.33);
    this.scene.add(ambient);

    const light1 = new THREE.DirectionalLight(0xffffff);
    light1.position.set(1, 1, 1);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(-1, 1, 1);
    this.scene.add(light2);

    window.addEventListener("resize", this.onWindowResize);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(window.devicePixelRatio);
    this.composer.setSize(canvas.clientWidth, canvas.clientHeight);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const gtaoPass = new GTAOPass(
      this.scene,
      this.camera,
      canvas.width,
      canvas.height,
    );
    const renderGTAO = gtaoPass.render.bind(gtaoPass);
    gtaoPass.render = (
      renderer,
      writeBuffer,
      readBuffer,
      deltaTime,
      maskActive,
    ) => {
      this.camera.layers.disable(EXCLUDE_AO_LAYER);

      renderGTAO.call(
        null,
        renderer,
        writeBuffer,
        readBuffer,
        deltaTime,
        maskActive,
      );

      this.camera.layers.enable(EXCLUDE_AO_LAYER);
    };
    const aoParameters = {
      radius: 5,
      distanceExponent: 1,
      thickness: 10,
      scale: 2,
      samples: 16,
      distanceFallOff: 0.5,
      screenSpaceRadius: false,
    };
    gtaoPass.updateGtaoMaterial(aoParameters);
    this.composer.addPass(gtaoPass);

    const smaaPass = new SMAAPass();
    this.composer.addPass(smaaPass);

    this.composer.addPass(new OutputPass());

    this.controls.update();

    Object.defineProperty(window, "$$renderTiles", {
      value: () => this.renderTiles(),
      configurable: true,
    });
  }

  dispose() {
    window.removeEventListener("resize", this.onWindowResize);
    this.unsubscribe();
    this.controls.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }

  get zoom() {
    return this.camera.zoom;
  }

  private zoomChanged = () => {
    this.onZoomChangeListeners.forEach((callback) => callback(this.cameraZoom));
  };

  onZoomChange(callback: (zoom: number) => void) {
    this.onZoomChangeListeners.push(callback);

    return () => {
      const index = this.onZoomChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.onZoomChangeListeners.splice(index, 1);
      }
    };
  }

  screenshot(name = "screenshot") {
    this.render();
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${name}.png`);
    }, "image/png");
  }

  private onWindowResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.cameraAspectRatio = parent.clientWidth / parent.clientHeight;

    this.camera.left = (-frustumSize * this.cameraAspectRatio) / 2;
    this.camera.right = (frustumSize * this.cameraAspectRatio) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.composer.setSize(parent.clientWidth, parent.clientHeight);
    this.render();
  };

  protected get canvas() {
    return this.renderer.domElement;
  }

  protected addMesh = <T extends THREE.Object3D>(mesh: T): T => {
    this.scene.add(mesh);
    return mesh;
  };

  protected removeMesh = (mesh?: THREE.Mesh | THREE.Line | null) => {
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  };

  protected loadResource = async (promise: Promise<THREE.Mesh>) => {
    const mesh = await promise;
    this.addMesh(mesh);
    requestAnimationFrame(() => this.render());
    return mesh;
  };

  protected render() {
    this.composer.render();

    this.cameraPosition.copy(this.camera.position);
    this.cameraLookAt.copy(this.controls.target);
    this.cameraZoom = this.camera.zoom;
    requestIdleCallback(() => {
      writeSS({
        position: this.cameraPosition.toArray(),
        lookAt: this.cameraLookAt.toArray(),
        zoom: this.cameraZoom,
      });
    });
  }

  lookAt(vector: THREE.Vector3, zoom?: number) {
    this.controls.target.copy(vector);
    this.camera.position.copy(vector.clone().setY(3000));
    this.camera.lookAt(vector);

    if (zoom !== undefined) {
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
    }

    this.controls.dispatchEvent({ type: "change" });
    this.controls.dispatchEvent({ type: "end" });
  }

  lookAtBox(box: THREE.Box3 | null) {
    if (!box) return;

    const margins = 0.05; // %
    const center = new THREE.Vector3();
    const width = Math.abs(box.max.x - box.min.x) * (1 + margins);
    const height = Math.abs(box.max.z - box.min.z) * (1 + margins);

    box.getCenter(center);
    center.setY(0);

    const horizontalZoom = (frustumSize * this.cameraAspectRatio) / width;
    const verticalZoom = frustumSize / height;
    const zoom = Math.min(horizontalZoom, verticalZoom);

    this.lookAt(center, zoom);
  }

  resetCamera() {
    this.lookAt(this.cameraLookAt, this.cameraZoom);
  }

  protected toggleControls(enabled: boolean) {
    this.controls.enabled = enabled;
  }

  protected toggleEffects(effects: RenderEffects) {
    this.composer.passes.forEach((pass) => {
      if (pass.constructor.name === GTAOPass.name) {
        pass.enabled = effects.includes("ao");
      }
      if (pass.constructor.name === SMAAPass.name) {
        pass.enabled = effects.includes("aa");
      }
    });
  }

  private async renderTiles() {
    const TILE_SIZE = 1000;
    const ZOOM = 1;
    const halfMap = MAP_SIZE / 2;
    const halfRes = TILE_SIZE / 2;
    this.renderer.setSize(TILE_SIZE, TILE_SIZE);
    this.composer.passes.forEach((pass) => {
      if (pass.setSize) {
        pass.setSize(TILE_SIZE * ZOOM, TILE_SIZE * ZOOM);
      }
    });
    this.camera.left = -halfRes;
    this.camera.right = halfRes;
    this.camera.top = halfRes;
    this.camera.bottom = -halfRes;
    this.camera.zoom = ZOOM;
    this.camera.updateProjectionMatrix();
    let counter = 0;
    for (
      let x = -halfMap + halfRes;
      x <= halfMap - halfRes;
      x += TILE_SIZE / ZOOM
    ) {
      for (
        let y = halfMap - halfRes;
        y >= -halfMap + halfRes;
        y -= TILE_SIZE / ZOOM
      ) {
        counter++;
        this.camera.position.set(x, 3000, y);
        this.camera.lookAt(new THREE.Vector3(x, 0, y));
        this.camera.updateProjectionMatrix();
        this.screenshot(`tile-${counter}`);
        await sleep(200);
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
