import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import type { District } from "../types.ts";
import { createInstancedMesh, type InstanceTransforms } from "./importDDS.ts";
import {
  buildingsMaterial,
  editorMaterial,
  virtualBlocksMaterial,
} from "./materials.ts";
import { importBuildings } from "./setupBuildings.ts";
import { setupTerrain } from "./setupTerrain.ts";

const frustumSize = 8_000;

export class Map3D {
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.OrthographicCamera;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #controls: MapControls;
  readonly #raycaster: THREE.Raycaster;
  #aspect: number = 1;
  #buildings: THREE.Mesh | null = null;
  #box: THREE.BoxHelper | null = null;
  #edits: THREE.InstancedMesh | null = null;
  #selectedIndexes: number[] = [];
  #virtualEdits: THREE.InstancedMesh | null = null;
  #cameraPosition: THREE.Vector3 = new THREE.Vector3(0, 3000, 0);
  #cameraLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  #cameraZoom: number = 1;
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #hoveringId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x0f172b);

    this.#raycaster = new THREE.Raycaster();
    this.#canvasRect = canvas.getBoundingClientRect();

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

    // controls

    this.#controls = new MapControls(this.#camera, canvas);
    this.#controls.addEventListener("change", this.#render); // call this only in static scenes (i.e., if there is no animation loop)

    this.#controls.zoomToCursor = true;
    this.#controls.minDistance = 1;
    this.#controls.maxDistance = 10_000;
    this.#controls.maxPolarAngle = Math.PI / 2;

    // world

    setupTerrain(this.#loadResource);

    // lights

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

    //

    window.addEventListener("resize", this.#onWindowResize);
    canvas.addEventListener("mousemove", this.#onMouseMove);
    canvas.addEventListener("click", this.#onClick);

    this.#render();
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
    this.#canvasRect = canvas.getBoundingClientRect();
    this.#render();
  };

  #onMouseMove = (event: MouseEvent) => {
    const { left, top, width, height } = this.#canvasRect!;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (this.#edits) {
      this.#raycaster.setFromCamera(this.#pointer, this.#camera);

      const intersection = this.#raycaster.intersectObject(this.#edits);

      if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;

        if (instanceId !== undefined) {
          const color = new THREE.Color(0x88ff88);

          this.#hoveringId = instanceId;
          this.#edits.setColorAt(instanceId, color);

          if (this.#edits.instanceColor)
            this.#edits.instanceColor.needsUpdate = true;

          requestAnimationFrame(this.#render);
        }
      } else if (this.#hoveringId !== null) {
        const color = new THREE.Color(0xffff00);

        if (this.#selectedIndexes.includes(this.#hoveringId)) {
          color.setHex(0x00ff00);
        }

        this.#edits.setColorAt(this.#hoveringId, color);

        if (this.#edits.instanceColor)
          this.#edits.instanceColor.needsUpdate = true;

        this.#hoveringId = null;
        requestAnimationFrame(this.#render);
      }
    }
  };

  #onClick = () => {
    if (this.#edits && this.#hoveringId != null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: this.#hoveringId } }),
      );
    }
  };

  #loadResource = (promise: Promise<THREE.Mesh>) => {
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

  #lookAtBox(box: THREE.Box3 | null) {
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

    this.#lookAt(center, zoom);
  }

  resetCamera() {
    this.#lookAt(this.#cameraLookAt, this.#cameraZoom);
  }

  setBuildingsData(district?: District) {
    if (this.#buildings) {
      this.#scene.remove(this.#buildings);
      this.#buildings.geometry.dispose();

      if (this.#box) {
        this.#scene.remove(this.#box);
        this.#box.geometry.dispose();
      }
      requestAnimationFrame(this.#render);
    }

    if (district) {
      this.#loadResource(
        importBuildings(district, buildingsMaterial).then((mesh) => {
          this.#buildings = mesh;

          this.#box = new THREE.BoxHelper(mesh, 0xffff00);
          this.#scene.add(this.#box);

          this.#box.geometry.computeBoundingBox();
          this.#lookAtBox(this.#box.geometry.boundingBox);

          return mesh;
        }),
      );
    }
  }

  setEditsData(district: District, data: InstanceTransforms[]) {
    if (this.#edits) {
      this.#scene.remove(this.#edits);
      this.#edits.geometry.dispose();
      requestAnimationFrame(this.#render);
    }

    this.#edits = createInstancedMesh(
      data,
      editorMaterial,
      district.cubeSize,
      new THREE.Vector3(...district.position),
      new THREE.Vector4(...district.transMin),
      new THREE.Vector4(...district.transMax),
    );
    this.#scene.add(this.#edits);
    requestAnimationFrame(this.#render);
  }

  setVirtualEditsData(district: District, data: InstanceTransforms[]) {
    if (this.#virtualEdits) {
      this.#scene.remove(this.#virtualEdits);
      this.#virtualEdits.geometry.dispose();
      requestAnimationFrame(this.#render);
    }

    this.#virtualEdits = createInstancedMesh(
      data,
      virtualBlocksMaterial,
      district.cubeSize,
      new THREE.Vector3(...district.position),
      new THREE.Vector4(...district.transMin),
      new THREE.Vector4(...district.transMax),
    );
    this.#scene.add(this.#virtualEdits);
    requestAnimationFrame(this.#render);
  }

  selectEditsData(indexes: number[]) {
    if (!this.#edits) return;

    const yellow = new THREE.Color(0xffff00);
    const green = new THREE.Color(0x00ff00);

    for (let i = 0; i < this.#edits.count; i++) {
      if (indexes.includes(i)) {
        this.#edits.setColorAt(i, green);
      } else {
        this.#edits.setColorAt(i, yellow);
      }
    }

    this.#selectedIndexes = indexes;
    if (this.#edits.instanceColor) this.#edits.instanceColor.needsUpdate = true;

    requestAnimationFrame(this.#render);
  }

  #lookAt(vector: THREE.Vector3, zoom?: number) {
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
}
