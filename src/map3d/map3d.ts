import * as THREE from "three";

import type { DistrictData, InstancedMeshTransforms } from "../types.ts";
import { Map3DBase } from "./map3d.base.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  virtualAdditionsMaterial,
} from "./materials.ts";
import { setupBuildings } from "./setupBuildings.ts";
import { setupTerrain } from "./setupTerrain.ts";

export class Map3D extends Map3DBase {
  readonly #raycaster: THREE.Raycaster;
  #buildings: THREE.InstancedMesh | null = null;
  #box: THREE.BoxHelper | null = null;
  #edits: THREE.InstancedMesh | null = null;
  #selectedIndexes: number[] = [];
  #virtualEdits: THREE.InstancedMesh | null = null;
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #hoveringId: number | null = null;
  #mode: "add" | "remove" = "add";
  dontLookAt = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.#raycaster = new THREE.Raycaster();
    this.#canvasRect = this.canvas.getBoundingClientRect();

    setupTerrain(this.loadResource);

    this.canvas.addEventListener("mousemove", this.#onMouseMove);
    this.canvas.addEventListener("click", this.#onClick);
    this.canvas.addEventListener("dblclick", this.#onDoubleClick);

    this.render();
  }

  dispose() {
    super.dispose();

    this.canvas.removeEventListener("mousemove", this.#onMouseMove);
    this.canvas.removeEventListener("click", this.#onClick);
    this.canvas.removeEventListener("dblclick", this.#onDoubleClick);

    this.#buildings?.geometry.dispose();
    this.#box?.geometry.dispose();
    this.#edits?.geometry.dispose();
    this.#virtualEdits?.geometry.dispose();
  }

  render = () => {
    super.render();
    this.#canvasRect = this.canvas.getBoundingClientRect();
  };

  #onMouseMove = (event: MouseEvent) => {
    const { left, top, width, height } = this.#canvasRect!;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (this.#mode === "add" && this.#edits) {
      this.#raycaster.setFromCamera(this.#pointer, this.camera);

      const intersection = this.#raycaster.intersectObject(this.#edits);

      if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;

        if (instanceId !== undefined) {
          const color = new THREE.Color(0x88ff88);

          if (this.#hoveringId !== null) {
            const color = new THREE.Color(0xffff00);

            if (this.#selectedIndexes.includes(this.#hoveringId)) {
              color.setHex(0x00ff00);
            }

            this.#edits.setColorAt(this.#hoveringId, color);
          }

          this.#hoveringId = instanceId;
          this.#edits.setColorAt(instanceId, color);

          if (this.#edits.instanceColor)
            this.#edits.instanceColor.needsUpdate = true;

          requestAnimationFrame(this.render);
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
        requestAnimationFrame(this.render);
      }
    } else if (this.#mode === "remove" && this.#buildings) {
      this.#raycaster.setFromCamera(this.#pointer, this.camera);

      const intersection = this.#raycaster.intersectObject(this.#buildings);

      if (intersection.length > 0) {
        const instanceId = intersection[0].instanceId;

        if (instanceId !== undefined) {
          const color = new THREE.Color(0x888888);

          if (this.#hoveringId !== null) {
            const color = new THREE.Color(0xffffff);

            this.#buildings.setColorAt(this.#hoveringId, color);
          }

          this.#buildings.setColorAt(instanceId, color);

          if (this.#buildings.instanceColor)
            this.#buildings.instanceColor.needsUpdate = true;

          this.#hoveringId = instanceId;
          requestAnimationFrame(this.render);
        }
      } else if (this.#hoveringId !== null) {
        const color = new THREE.Color(0xffffff);

        this.#buildings.setColorAt(this.#hoveringId, color);

        if (this.#buildings.instanceColor)
          this.#buildings.instanceColor.needsUpdate = true;

        this.#hoveringId = null;
        requestAnimationFrame(this.render);
      }
    }
  };

  #onClick = () => {
    if (this.#mode === "add" && this.#edits && this.#hoveringId != null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: this.#hoveringId } }),
      );
    }
  };

  #onDoubleClick = () => {
    if (this.#mode === "add" && this.#hoveringId === null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
    } else if (
      this.#mode === "remove" &&
      this.#buildings &&
      this.#hoveringId != null
    ) {
      this.dontLookAt = true;
      window.dispatchEvent(
        new CustomEvent("remove-node", { detail: { index: this.#hoveringId } }),
      );
    }
  };

  #remove(mesh?: THREE.Mesh | THREE.Line | null) {
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  #add<T extends THREE.Object3D>(mesh: T): T {
    this.scene.add(mesh);
    return mesh;
  }

  setBuildingsData(district: DistrictData, data: InstancedMeshTransforms[]) {
    this.#remove(this.#buildings);
    this.#remove(this.#box);

    this.#buildings = this.#add(
      setupBuildings(data, buildingsMaterial, district),
    );
    this.#box = this.#add(new THREE.BoxHelper(this.#buildings, 0xffff00));

    this.#box.geometry.computeBoundingBox();
    if (!this.dontLookAt) {
      this.lookAtBox(this.#box.geometry.boundingBox);
    }
    this.dontLookAt = false;

    requestAnimationFrame(this.render);
  }

  setEditsData(district: DistrictData, data: InstancedMeshTransforms[]) {
    const [real, virtual] = data.reduce(
      (acc, instance) => {
        acc[instance.virtual ? 1 : 0].push(instance);
        return acc;
      },
      [[], []] as [InstancedMeshTransforms[], InstancedMeshTransforms[]],
    );

    this.#remove(this.#edits);
    this.#remove(this.#virtualEdits);

    this.#edits = this.#add(setupBuildings(real, additionsMaterial, district));
    this.#virtualEdits = this.#add(
      setupBuildings(virtual, virtualAdditionsMaterial, district),
    );

    requestAnimationFrame(this.render);
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

    requestAnimationFrame(this.render);
  }

  setMode(mode: "add" | "remove") {
    this.#mode = mode;
  }
}
