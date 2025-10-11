import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import { saveBlobToFile } from "../helpers.ts";

export const frustumSize = 8_000;

export class Map3DBase {
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.OrthographicCamera;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #controls: MapControls;
  #aspect: number = 1;
  #cameraPosition: THREE.Vector3 = new THREE.Vector3(0, 3000, 0);
  #cameraLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  #cameraZoom: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x0f172b);

    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    this.#aspect = canvas.clientWidth / canvas.clientHeight;
    this.#camera = new THREE.OrthographicCamera(
      (frustumSize * this.#aspect) / -2,
      (frustumSize * this.#aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      20_000,
    );
    this.#camera.position.copy(this.#cameraPosition);
    this.#camera.lookAt(this.#cameraLookAt);
    this.#camera.zoom = this.#cameraZoom;
    this.#camera.updateProjectionMatrix();

    this.#controls = new MapControls(this.#camera, canvas);
    this.#controls.addEventListener("change", this.#render); // call this only in static scenes (i.e., if there is no animation loop)

    this.#controls.zoomToCursor = true;
    this.#controls.minDistance = 1;
    this.#controls.maxDistance = 10_000;
    this.#controls.maxPolarAngle = Math.PI / 2;

    const light1 = new THREE.DirectionalLight(0xffffff);
    light1.position.set(100, -70, 100).normalize();
    this.#scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff);
    light2.position.set(100, 70, 100).normalize();
    this.#scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff);
    light3.intensity = 0.5;
    light3.position.set(-100, 70, 100).normalize();
    this.#scene.add(light3);

    // const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
    // dirLight1.position.set(1, 1, 1);
    // this.#scene.add(dirLight1);
    //
    // const dirLight2 = new THREE.DirectionalLight(0x002288, 3);
    // dirLight2.position.set(-1, -1, -1);
    // this.#scene.add(dirLight2);
    //
    // const ambientLight = new THREE.AmbientLight(0x555555);
    // this.#scene.add(ambientLight);

    window.addEventListener("resize", this.#onWindowResize);

    this.render();
  }

  dispose() {
    window.removeEventListener("resize", this.#onWindowResize);
    this.#renderer.dispose();
  }

  screenshot() {
    this.#render();
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      saveBlobToFile(blob, "screenshot.png");
    }, "image/png");
  }

  #onWindowResize = () => {
    const canvas = this.#renderer.domElement;
    this.#aspect = canvas.clientWidth / canvas.clientHeight;

    this.#camera.left = (-frustumSize * this.#aspect) / 2;
    this.#camera.right = (frustumSize * this.#aspect) / 2;
    this.#camera.top = frustumSize / 2;
    this.#camera.bottom = -frustumSize / 2;

    this.#camera.updateProjectionMatrix();

    this.#renderer.setSize(canvas.clientWidth, canvas.clientHeight);
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
    promise.then((mesh: THREE.Mesh) => {
      this.#scene.add(mesh);
      requestAnimationFrame(this.#render);
    });
  };

  #render = () => {
    this.#renderer.render(this.#scene, this.#camera);

    this.#cameraPosition.copy(this.#camera.position);
    this.#cameraLookAt.copy(this.#controls.target);
    this.#cameraZoom = this.#camera.zoom;
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
}
