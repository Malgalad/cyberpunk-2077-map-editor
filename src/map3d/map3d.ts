import * as THREE from "three";

import type {
  DistrictWithTransforms,
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
  patternMaterial,
  wireframeMaterial,
} from "./materials.ts";
import { setupTerrain } from "./setupTerrain.ts";

const virtualEditsMaterial: Record<PatternView, THREE.Material> = {
  none: hiddenMaterial,
  wireframe: wireframeMaterial,
  solid: patternMaterial,
};

export class Map3D extends Map3DBase {
  readonly #raycaster: THREE.Raycaster;
  #currentDistrict: THREE.InstancedMesh | null = null;
  #currentDistrictBoundaries: THREE.BoxHelper | null = null;
  #visibleDistricts: THREE.Group = new THREE.Group();
  #additions: THREE.InstancedMesh | null = null;
  #selectedIndexes: number[] = [];
  #virtualGeometry: THREE.InstancedMesh | null = null;
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #hoveringIndex: number | null = null;
  #editingMode: EditingMode = "add";
  #patternView: PatternView = "wireframe";
  dontLookAt = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.#raycaster = new THREE.Raycaster();
    this.#canvasRect = this.canvas.getBoundingClientRect();

    setupTerrain(this.loadResource);
    this.scene.add(this.#visibleDistricts);

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

    this.#currentDistrict?.geometry.dispose();
    this.#currentDistrictBoundaries?.geometry.dispose();
    this.#additions?.geometry.dispose();
    this.#virtualGeometry?.geometry.dispose();
  }

  /** Add mesh to scene */
  #add<T extends THREE.Object3D>(mesh: T): T {
    this.scene.add(mesh);
    return mesh;
  }

  /** Remove mesh from scene and dispose of geometry */
  #remove(mesh?: THREE.Mesh | THREE.Line | null) {
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  /** Apply selected material to virtual geometry */
  #refreshVirtualGeometry() {
    if (!this.#virtualGeometry) return;

    this.#virtualGeometry.material = virtualEditsMaterial[this.#patternView];
    const color = new THREE.Color(0xffff00);

    for (let i = 0; i < this.#virtualGeometry.count; i++) {
      this.#virtualGeometry.setColorAt(i, color);
    }

    if (this.#virtualGeometry.instanceColor)
      this.#virtualGeometry.instanceColor.needsUpdate = true;

    requestAnimationFrame(this.render);
  }

  #onMouseMove = (event: MouseEvent) => {
    const { left, top, width, height } = this.#canvasRect!;
    const mode = this.#editingMode;
    let shouldRender = false;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (mode === "add" && !this.#additions) return;
    if (mode === "remove" && !this.#currentDistrict) return;

    const mesh = (
      mode === "add" ? this.#additions : this.#currentDistrict
    ) as THREE.InstancedMesh;

    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const intersection = this.#raycaster.intersectObject(mesh);
    const previousHoveringId = this.#hoveringIndex;

    if (intersection.length > 0) {
      const instanceId = intersection[0].instanceId;

      if (instanceId !== undefined) {
        const color = new THREE.Color(mode === "add" ? 0x88ff88 : 0x888888);

        this.#hoveringIndex = instanceId;

        mesh.setColorAt(instanceId, color);
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        shouldRender = true;
      }
    } else {
      this.#hoveringIndex = null;
    }

    if (
      previousHoveringId !== null &&
      previousHoveringId !== this.#hoveringIndex
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
      this.#additions &&
      this.#hoveringIndex != null
    ) {
      window.dispatchEvent(
        new CustomEvent("select-node", {
          detail: { index: this.#hoveringIndex },
        }),
      );
    }
  };

  #onDoubleClick = () => {
    if (this.#editingMode === "add" && this.#hoveringIndex === null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
    } else if (
      this.#editingMode === "remove" &&
      this.#currentDistrict &&
      this.#hoveringIndex != null
    ) {
      this.dontLookAt = true;
      window.dispatchEvent(
        new CustomEvent("remove-node", {
          detail: { index: this.#hoveringIndex },
        }),
      );
    }
  };

  selectAdditionsInstances(indexes: number[]) {
    if (!this.#additions) return;

    const yellow = new THREE.Color(0xffff00);
    const green = new THREE.Color(0x00ff00);

    for (let i = 0; i < this.#additions.count; i++) {
      if (indexes.includes(i)) {
        this.#additions.setColorAt(i, green);
      } else {
        this.#additions.setColorAt(i, yellow);
      }
    }

    this.#selectedIndexes = indexes;
    if (this.#additions.instanceColor)
      this.#additions.instanceColor.needsUpdate = true;

    requestAnimationFrame(this.render);
  }

  setAdditions(data: DistrictWithTransforms) {
    const [real, virtual] = data.transforms.reduce(
      (acc, instance) => {
        acc[instance.virtual ? 1 : 0].push(instance);
        return acc;
      },
      [[], []] as [InstancedMeshTransforms[], InstancedMeshTransforms[]],
    );

    this.#remove(this.#additions);
    this.#remove(this.#virtualGeometry);

    this.#additions = this.#add(
      createInstancedMeshForDistrict(data.district, real, additionsMaterial),
    );
    this.#virtualGeometry = this.#add(
      createInstancedMeshForDistrict(
        data.district,
        virtual,
        virtualEditsMaterial[this.#patternView],
      ),
    );

    if (this.#patternView === "solid") {
      const color = new THREE.Color(0xffff00);

      for (let i = 0; i < this.#virtualGeometry.count; i++) {
        this.#virtualGeometry.setColorAt(i, color);
      }
    }

    requestAnimationFrame(this.render);
  }

  setCurrentDistrict(data: DistrictWithTransforms) {
    this.#remove(this.#currentDistrict);
    this.#remove(this.#currentDistrictBoundaries);

    const { district, transforms } = data;
    this.#currentDistrict = this.#add(
      createInstancedMeshForDistrict(district, transforms, buildingsMaterial),
    );
    const minMaxBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    minMaxBox.scale.set(
      district.transMax[0] - district.transMin[0],
      district.transMax[2] - district.transMin[2],
      -district.transMax[1] + district.transMin[1],
    );
    minMaxBox.position.set(
      district.position[0] + district.transMin[0] + minMaxBox.scale.x / 2,
      district.position[2] + district.transMin[2] + minMaxBox.scale.y / 2,
      -district.position[1] - district.transMin[1] + minMaxBox.scale.z / 2,
    );
    this.#currentDistrictBoundaries = this.#add(
      new THREE.BoxHelper(minMaxBox, 0xff8800),
    );

    this.#currentDistrictBoundaries.geometry.computeBoundingBox();
    if (!this.dontLookAt) {
      this.lookAtBox(this.#currentDistrictBoundaries.geometry.boundingBox);
    }
    this.dontLookAt = false;

    requestAnimationFrame(this.render);
  }

  setEditingMode(mode: EditingMode) {
    this.#editingMode = mode;
  }

  setPatternView(view: PatternView) {
    this.#patternView = view;
    this.#refreshVirtualGeometry();
  }

  setVisibleDistricts(districts: DistrictWithTransforms[]) {
    const visibleNames = districts.map((item) => item.district.name);

    for (const object3d of this.#visibleDistricts.children) {
      const { name } = object3d.userData;

      if (!visibleNames.includes(name)) {
        this.#visibleDistricts.remove(object3d);
        (object3d as THREE.InstancedMesh).geometry.dispose();
      }
    }

    const currentNames = this.#visibleDistricts.children.map(
      (object3d) => object3d.userData.name as string,
    );

    for (const item of districts) {
      const { district, transforms } = item;

      if (!currentNames.includes(district.name)) {
        const mesh = createInstancedMeshForDistrict(
          district,
          transforms,
          buildingsMaterial,
        );
        mesh.userData = { name: district.name };
        this.#visibleDistricts.add(mesh);
      }
    }

    requestAnimationFrame(this.render);
  }

  render = () => {
    super.render();
    this.#canvasRect = this.canvas.getBoundingClientRect();
  };
}
