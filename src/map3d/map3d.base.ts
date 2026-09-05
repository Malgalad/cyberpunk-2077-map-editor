import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import type { AppStore } from "../types/types.ts";
import { downloadBlob } from "../utilities/fileHelpers.ts";
import { MAP_SIZE } from "./constants.ts";
import Lights from "./Lights.ts";
import { experimentalMetroMaterial } from "./materials.ts";
import RenderPipeline from "./RenderPipeline.ts";

export const frustumSize = 8_000;
const readSS = () => JSON.parse(sessionStorage.getItem("camera") || "null");
const writeSS = (data: {
  position: number[];
  lookAt: number[];
  zoom: number;
}) => sessionStorage.setItem("camera", JSON.stringify(data));
const startPosition = () => readSS()?.position || [0, 3000, 0];
const startLookAt = () => readSS()?.lookAt || [0, 0, 0];

export class Map3DBase {
  protected readonly scene: THREE.Scene;
  protected readonly camera: THREE.OrthographicCamera;
  protected readonly renderPipeline: RenderPipeline;
  protected readonly controls: MapControls;
  private readonly timerID: number | undefined;
  private cameraAspectRatio: number = 1;
  private cameraPosition: THREE.Vector3 = new THREE.Vector3(...startPosition());
  private cameraLookAt: THREE.Vector3 = new THREE.Vector3(...startLookAt());
  private cameraZoom: number = readSS()?.zoom || 1;
  private onZoomChangeListeners: ((zoom: number) => void)[] = [];

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172b);

    this.scene.add(new Lights());

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

    this.renderPipeline = new RenderPipeline({
      store,
      scene: this.scene,
      camera: this.camera,
      renderer: new THREE.WebGLRenderer({ canvas }),
    });

    this.controls = new MapControls(this.camera, canvas);
    this.controls.addEventListener("change", () =>
      requestAnimationFrame(() => this.render()),
    );
    this.controls.addEventListener("change", this.onControlsChanged);
    this.controls.target.copy(this.cameraLookAt);
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10_000;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.update();

    window.addEventListener("resize", this.onWindowResize);
    this.timerID = setInterval(() => {
      writeSS({
        position: this.cameraPosition.toArray(),
        lookAt: this.cameraLookAt.toArray(),
        zoom: this.cameraZoom,
      });
    }, 1000);

    Object.defineProperty(window, "$$renderTiles", {
      value: () => this.renderTiles(),
      configurable: true,
    });
  }

  dispose() {
    window.removeEventListener("resize", this.onWindowResize);
    clearInterval(this.timerID);
    this.scene.children.forEach((child) => {
      if ("dispose" in child && child.dispose instanceof Function) {
        child.dispose();
      }
    });
    this.controls.dispose();
    this.renderPipeline.dispose();
  }

  get zoom() {
    return this.camera.zoom;
  }

  private onControlsChanged = () => {
    if (this.camera.zoom !== this.cameraZoom) {
      for (const callback of this.onZoomChangeListeners) {
        callback(this.camera.zoom);
      }
      experimentalMetroMaterial.uniforms.cameraZoom.value = this.camera.zoom;
    }
    this.cameraPosition.copy(this.camera.position);
    this.cameraLookAt.copy(this.controls.target);
    this.cameraZoom = this.camera.zoom;
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
    return new Promise<void>((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create screenshot"));
          return;
        }

        downloadBlob(blob, `${name}.png`);
        resolve();
      }, "image/png");
    });
  }

  async screenshotCurrentView() {
    try {
      await this.canvas.requestFullscreen({ navigationUI: "hide" });
      await nextFrame();

      this.renderPipeline.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderPipeline.setPixelRatio(window.devicePixelRatio);
      this.resize(window.screen.width, window.screen.height);
      await nextFrame();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      await this.screenshot(`nc-3dmap-editor-${timestamp}`);
    } finally {
      if (document.fullscreenElement === this.canvas) {
        await document.exitFullscreen();
      }

      await nextFrame();
      this.onWindowResize();
    }
  }

  private onWindowResize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const width =
      document.fullscreenElement === this.canvas
        ? window.screen.width
        : parent.clientWidth;
    const height =
      document.fullscreenElement === this.canvas
        ? window.screen.height
        : parent.clientHeight;

    this.resize(width, height);
  };

  private resize(width: number, height: number) {
    this.cameraAspectRatio = width / height;

    this.camera.left = (-frustumSize * this.cameraAspectRatio) / 2;
    this.camera.right = (frustumSize * this.cameraAspectRatio) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.renderPipeline.renderer.setSize(width, height, false);
    this.renderPipeline.setSize(width, height);
    this.render();
  }

  protected get canvas() {
    return this.renderPipeline.renderer.domElement;
  }

  protected addMesh = <T extends THREE.Object3D>(mesh: T): T => {
    this.scene.add(mesh);
    return mesh;
  };

  protected removeMesh = <T extends THREE.Object3D>(mesh?: T | null) => {
    if (!mesh) return;
    this.scene.remove(mesh);
    if ("geometry" in mesh && mesh.geometry instanceof THREE.BufferGeometry) {
      mesh.geometry.dispose();
    }
  };

  protected render() {
    this.renderPipeline.render();
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

  private async renderTiles() {
    const TILE_SIZE = 1000;
    const ZOOM = 1;
    const halfMap = MAP_SIZE / 2;
    const halfRes = TILE_SIZE / 2;
    this.renderPipeline.renderer.setSize(TILE_SIZE, TILE_SIZE);
    this.renderPipeline.setSize(TILE_SIZE, TILE_SIZE);
    this.camera.left = -halfRes;
    this.camera.right = halfRes;
    this.camera.top = halfRes;
    this.camera.bottom = -halfRes;
    this.camera.zoom = ZOOM;
    this.camera.updateProjectionMatrix();
    experimentalMetroMaterial.uniforms.cameraZoom.value = 50;
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
        await this.screenshot(`tile-${counter}`);
        await sleep(200);
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
