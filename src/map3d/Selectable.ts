import { shallowEqual } from "react-redux";
import * as THREE from "three";

import { EXCLUDE_AO_LAYER } from "./constants.ts";

class Selectable {
  private readonly pointer: THREE.Vector2 = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly camera: THREE.Camera;
  private readonly canvas: HTMLCanvasElement;
  private canvasRect: DOMRect;
  private intersections: THREE.Intersection[] = [];
  private intersectionIndex = 0;
  private meshes: THREE.Object3D[] = [];

  constructor(canvas: HTMLCanvasElement, camera: THREE.Camera) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();

    this.camera = camera;

    this.raycaster.layers.enable(EXCLUDE_AO_LAYER);

    window.addEventListener("resize", this.onResize);
    document.addEventListener("keyup", this.changeIntersectionIndex);
    document.addEventListener("wheel", this.changeIntersectionIndex);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseleave", this.onMouseLeave);
  }

  dispose() {
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("keyup", this.changeIntersectionIndex);
    document.removeEventListener("wheel", this.changeIntersectionIndex);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
  }

  private onResize = () => {
    this.canvasRect = this.canvas.getBoundingClientRect();
  };

  private onMouseMove = (event: MouseEvent) => {
    this.setPointer(event);
    this.intersect();
  };

  private onMouseLeave = () => {
    this.pointer.set(9999, 9999);
    this.intersect();
  };

  private changeIntersectionIndex = (event: KeyboardEvent | WheelEvent) => {
    const min = 0;
    const max = this.intersections.length - 1;
    const isKeyboardEvent = event instanceof KeyboardEvent;
    const isWheelEvent = event instanceof WheelEvent;

    if (min === max) return;

    if (
      (isKeyboardEvent &&
        (event.code === "ArrowUp" || event.code === "KeyC")) ||
      (isWheelEvent && event.deltaY > 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === max ? min : this.intersectionIndex + 1;
      this.onUpdate();
    }

    if (
      (isKeyboardEvent &&
        (event.code === "ArrowDown" || event.code === "KeyZ")) ||
      (isWheelEvent && event.deltaY < 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === min ? max : this.intersectionIndex - 1;
      this.onUpdate();
    }
  };

  private onUpdate() {
    this.meshes.forEach((mesh) => {
      if ("onUpdate" in mesh && typeof mesh.onUpdate === "function") {
        mesh.onUpdate();
      }
    });
  }

  private setPointer(event: MouseEvent) {
    const { left, top, width, height } = this.canvasRect;

    this.pointer.set(
      ((event.clientX - left) / width) * 2 - 1,
      -((event.clientY - top) / height) * 2 + 1,
    );
  }

  add(mesh: THREE.Object3D) {
    this.meshes.push(mesh);
    Object.defineProperty(mesh.userData, "intersection", {
      get: () => this.intersection,
    });
  }

  intersect() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.meshes);

    if (!shallowEqual(intersections, this.intersections)) {
      this.intersections = intersections;
      this.intersectionIndex = 0;
      this.onUpdate();
    }
  }

  get intersection(): undefined | THREE.Intersection {
    const viable = this.intersections.filter(
      ({ object }) => object.userData.viable,
    );

    return viable[this.intersectionIndex];
  }
}

export default Selectable;
