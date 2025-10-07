import * as THREE from "three";

import type {
  DistrictData,
  EditingMode,
  InstancedMeshTransforms,
  PatternView,
} from "../types.ts";
import { createInstancedMeshForDistrict } from "./createInstancedMeshForDistrict.ts";
import { Map3DBase } from "./map3d.base.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  hiddenMaterial,
  wireframeMaterial,
} from "./materials.ts";
import { setupTerrain } from "./setupTerrain.ts";

const virtualEditsMaterial: Record<PatternView, THREE.Material> = {
  none: hiddenMaterial,
  wireframe: wireframeMaterial,
  solid: additionsMaterial,
};

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
  #editingMode: EditingMode = "add";
  #patternView: PatternView = "wireframe";
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
    const mode = this.#editingMode;
    let shouldRender = false;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (mode === "add" && !this.#edits) return;
    if (mode === "remove" && !this.#buildings) return;

    const mesh = (
      mode === "add" ? this.#edits : this.#buildings
    ) as THREE.InstancedMesh;

    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const intersection = this.#raycaster.intersectObject(mesh);
    const previousHoveringId = this.#hoveringId;

    if (intersection.length > 0) {
      const instanceId = intersection[0].instanceId;

      if (instanceId !== undefined) {
        const color = new THREE.Color(mode === "add" ? 0x88ff88 : 0x888888);

        this.#hoveringId = instanceId;

        mesh.setColorAt(instanceId, color);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        shouldRender = true;
      }
    } else {
      this.#hoveringId = null;
    }

    if (
      previousHoveringId !== null &&
      previousHoveringId !== this.#hoveringId
    ) {
      const color = new THREE.Color(mode === "add" ? 0xffff00 : 0xffffff);

      if (
        mode === "add" &&
        this.#selectedIndexes.includes(previousHoveringId)
      ) {
        color.setHex(0x00ff00);
      }

      mesh.setColorAt(previousHoveringId, color);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      shouldRender = true;
    }

    if (shouldRender) requestAnimationFrame(this.render);
  };

  #onClick = () => {
    if (
      this.#editingMode === "add" &&
      this.#edits &&
      this.#hoveringId != null
    ) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: this.#hoveringId } }),
      );
    }
  };

  #onDoubleClick = () => {
    if (this.#editingMode === "add" && this.#hoveringId === null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
    } else if (
      this.#editingMode === "remove" &&
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
      createInstancedMeshForDistrict(district, data, buildingsMaterial),
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

    this.#edits = this.#add(
      createInstancedMeshForDistrict(district, real, additionsMaterial),
    );
    this.#virtualEdits = this.#add(
      createInstancedMeshForDistrict(
        district,
        virtual,
        virtualEditsMaterial[this.#patternView],
      ),
    );

    if (this.#patternView === "solid") {
      const color = new THREE.Color(0xffff00);

      for (let i = 0; i < this.#virtualEdits.count; i++) {
        this.#virtualEdits.setColorAt(i, color);
      }
    }

    requestAnimationFrame(this.render);
  }

  #refreshEditsData() {
    if (!this.#virtualEdits) return;

    this.#virtualEdits.material = virtualEditsMaterial[this.#patternView];
    const color = new THREE.Color(0xffff00);

    for (let i = 0; i < this.#virtualEdits.count; i++) {
      this.#virtualEdits.setColorAt(i, color);
    }

    if (this.#virtualEdits.instanceColor)
      this.#virtualEdits.instanceColor.needsUpdate = true;

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

  setEditingMode(mode: EditingMode) {
    this.#editingMode = mode;
  }

  setPatternView(view: PatternView) {
    this.#patternView = view;
    this.#refreshEditsData();
  }
}
