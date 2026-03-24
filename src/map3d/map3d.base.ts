import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { downloadBlob } from "../utilities/fileHelpers.ts";
import { MAP_SIZE } from "./constants.ts";

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
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.OrthographicCamera;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #composer: EffectComposer;
  readonly #controls: MapControls;
  #aspect: number = 1;
  #cameraPosition: THREE.Vector3 = new THREE.Vector3(...startPosition);
  #cameraLookAt: THREE.Vector3 = new THREE.Vector3(...startLookAt);
  #cameraZoom: number = saved.zoom || 1;
  #previousCameraZoom: number = this.#cameraZoom;
  #zoomListeners: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x0f172b);

    this.#renderer = new THREE.WebGLRenderer({ canvas });
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.#aspect = canvas.clientWidth / canvas.clientHeight;
    this.#camera = new THREE.OrthographicCamera(
      (frustumSize * this.#aspect) / -2,
      (frustumSize * this.#aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      5_000,
    );
    this.#camera.position.copy(this.#cameraPosition);
    this.#camera.lookAt(this.#cameraLookAt);
    this.#camera.zoom = this.#cameraZoom;
    this.#camera.updateProjectionMatrix();

    this.#controls = new MapControls(this.#camera, canvas);
    this.#controls.addEventListener("change", this.#render); // call this only in static scenes (i.e., if there is no animation loop)
    this.#controls.addEventListener("change", this.#zoomChanged);
    this.#controls.target.copy(this.#cameraLookAt);

    this.#controls.zoomToCursor = true;
    this.#controls.minDistance = 1;
    this.#controls.maxDistance = 10_000;
    this.#controls.maxPolarAngle = Math.PI / 2;

    const ambient = new THREE.AmbientLight(0x404040, 0.33);
    this.#scene.add(ambient);

    const light1 = new THREE.DirectionalLight(0xffffff);
    light1.position.set(1, 1, 1);
    this.#scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
    light2.position.set(-1, 1, 1);
    this.#scene.add(light2);

    window.addEventListener("resize", this.#onWindowResize);

    this.#composer = new EffectComposer(this.#renderer);
    this.#composer.setPixelRatio(window.devicePixelRatio);
    this.#composer.setSize(canvas.clientWidth, canvas.clientHeight);

    const renderPass = new RenderPass(this.#scene, this.#camera);
    this.#composer.addPass(renderPass);

    const ssaoPass = new SSAOPass(
      this.#scene,
      this.#camera,
      canvas.width,
      canvas.height,
    );
    ssaoPass.minDistance = 0.0001;
    ssaoPass.maxDistance = 0.5;
    ssaoPass.kernelRadius = 16;
    ssaoPass.ssaoMaterial.defines.PERSPECTIVE_CAMERA = 0;
    ssaoPass.ssaoMaterial.defines.needsUpdate = true;
    this.#composer.addPass(ssaoPass);

    const smaaPass = new SMAAPass();
    this.#composer.addPass(smaaPass);

    this.#composer.addPass(new OutputPass());

    this.#controls.update();
    this.render();

    Object.defineProperty(window, "$$renderTiles", {
      value: () => this.renderTiles(),
      configurable: true,
    });
  }

  dispose() {
    window.removeEventListener("resize", this.#onWindowResize);
    this.#controls.dispose();
    this.#renderer.dispose();
    this.#composer.dispose();
  }

  #zoomChanged = () => {
    if (this.#previousCameraZoom === this.#cameraZoom) return;
    this.#previousCameraZoom = this.#cameraZoom;
    this.#zoomListeners.forEach((callback) => callback());
  };

  onZoomChange(callback: () => void) {
    this.#zoomListeners.push(callback);

    return () => {
      const index = this.#zoomListeners.indexOf(callback);
      if (index !== -1) {
        this.#zoomListeners.splice(index, 1);
      }
    };
  }

  screenshot(name = "screenshot") {
    this.#render();
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${name}.png`);
    }, "image/png");
  }

  #onWindowResize = () => {
    const parent = this.#renderer.domElement.parentElement as HTMLDivElement;
    this.#aspect = parent.clientWidth / parent.clientHeight;

    this.#camera.left = (-frustumSize * this.#aspect) / 2;
    this.#camera.right = (frustumSize * this.#aspect) / 2;
    this.#camera.top = frustumSize / 2;
    this.#camera.bottom = -frustumSize / 2;

    this.#camera.updateProjectionMatrix();

    this.#renderer.setSize(parent.clientWidth, parent.clientHeight);
    this.#composer.setSize(parent.clientWidth, parent.clientHeight);
    this.#composer.passes.forEach((pass) => {
      if (pass.setSize) {
        pass.setSize(parent.clientWidth, parent.clientHeight);
      }
    });
    this.render();
  };

  get canvas() {
    return this.#renderer.domElement;
  }

  get camera() {
    return this.#camera;
  }

  get scene() {
    return this.#scene;
  }

  loadResource = (promise: Promise<THREE.Mesh>) => {
    return promise.then((mesh: THREE.Mesh) => {
      this.#scene.add(mesh);
      requestAnimationFrame(this.#render);
      return mesh;
    });
  };

  #render = () => {
    this.#composer.render();

    this.#cameraPosition.copy(this.#camera.position);
    this.#cameraLookAt.copy(this.#controls.target);
    this.#cameraZoom = this.#camera.zoom;
    requestIdleCallback(() => {
      writeSS({
        position: this.#cameraPosition.toArray(),
        lookAt: this.#cameraLookAt.toArray(),
        zoom: this.#cameraZoom,
      });
    });
  };

  render() {
    this.#render();
  }

  lookAt(vector: THREE.Vector3, zoom?: number) {
    this.#controls.target.copy(vector);
    this.#camera.position.copy(vector.clone().setY(3000));
    this.#camera.lookAt(vector);

    if (zoom !== undefined) {
      this.#camera.zoom = zoom;
      this.#camera.updateProjectionMatrix();
    }

    this.#controls.dispatchEvent({ type: "change" });
    this.#controls.dispatchEvent({ type: "end" });
  }

  lookAtBox(box: THREE.Box3 | null) {
    if (!box) return;

    const margins = 0.05; // %
    const center = new THREE.Vector3();
    const width = Math.abs(box.max.x - box.min.x) * (1 + margins);
    const height = Math.abs(box.max.z - box.min.z) * (1 + margins);

    box.getCenter(center);
    center.setY(0);

    const horizontalZoom = (frustumSize * this.#aspect) / width;
    const verticalZoom = frustumSize / height;
    const zoom = Math.min(horizontalZoom, verticalZoom);

    this.lookAt(center, zoom);
  }

  resetCamera() {
    this.lookAt(this.#cameraLookAt, this.#cameraZoom);
  }

  toggleControls(enabled: boolean) {
    this.#controls.enabled = enabled;
  }

  async renderTiles() {
    const TILE_SIZE = 800;
    const ZOOM = 1.5;
    const halfMap = MAP_SIZE / 2;
    const halfRes = TILE_SIZE / 2;
    this.#renderer.setSize(TILE_SIZE, TILE_SIZE);
    this.#composer.passes.forEach((pass) => {
      if (pass.setSize) {
        pass.setSize(TILE_SIZE * ZOOM, TILE_SIZE * ZOOM);
      }
    });
    this.#camera.left = -halfRes;
    this.#camera.right = halfRes;
    this.#camera.top = halfRes;
    this.#camera.bottom = -halfRes;
    this.#camera.zoom = ZOOM;
    this.#camera.updateProjectionMatrix();
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
        this.#camera.position.set(x, 3000, y);
        this.#camera.lookAt(new THREE.Vector3(x, 0, y));
        this.#camera.updateProjectionMatrix();
        this.screenshot(`tile-${counter}`);
        await sleep(50);
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
