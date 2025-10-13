import * as THREE from "three";

import type {
  DistrictWithTransforms,
  EditingMode,
  PatternView,
} from "../types.ts";
import { partition } from "../utilities.ts";
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
  #currentDistrictRemovals: THREE.InstancedMesh | null = null;
  #currentDistrictBoundaries: THREE.BoxHelper | null = null;
  #visibleDistricts: THREE.Group = new THREE.Group();
  #additions: THREE.InstancedMesh | null = null;
  #selectedIndexes: number[] = [];
  #virtualGeometry: THREE.InstancedMesh | null = null;
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #startedPointingAt: number | null = null;
  #pointingAt: number | null = null;
  #editingMode: EditingMode = "add";
  #patternView: PatternView = "wireframe";
  dontLookAt = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.#raycaster = new THREE.Raycaster();
    this.#canvasRect = this.canvas.getBoundingClientRect();

    setupTerrain(this.loadResource);
    this.scene.add(this.#visibleDistricts);

    this.canvas.addEventListener("mousedown", this.#onMouseDown);
    this.canvas.addEventListener("mousemove", this.#onMouseMove);
    this.canvas.addEventListener("click", this.#onClick);

    this.render();
  }

  dispose() {
    super.dispose();

    this.canvas.removeEventListener("mousedown", this.#onMouseDown);
    this.canvas.removeEventListener("mousemove", this.#onMouseMove);
    this.canvas.removeEventListener("click", this.#onClick);

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
  #setVirtualGeometryMaterial() {
    if (!this.#virtualGeometry) return;

    this.#virtualGeometry.material = virtualEditsMaterial[this.#patternView];

    requestAnimationFrame(this.render);
  }

  #onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this.#startedPointingAt = this.#pointingAt;
  };

  #onMouseMove = (event: MouseEvent) => {
    const { left, top, width, height } = this.#canvasRect!;
    const mode = this.#editingMode;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (mode === "add" && !this.#additions) return;
    if (mode === "remove" && !this.#currentDistrict) return;

    const mesh = mode === "add" ? this.#additions! : this.#currentDistrict!;

    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const intersection = this.#raycaster.intersectObject(mesh);
    const previousPointingAt = this.#pointingAt;

    if (intersection.length > 0) {
      const instanceId = intersection[0].instanceId;

      if (instanceId !== undefined) {
        this.#pointingAt = instanceId;
      }
    } else {
      this.#pointingAt = null;
    }

    if (this.#pointingAt !== previousPointingAt)
      requestAnimationFrame(this.render);
  };

  #onClick = (event: MouseEvent) => {
    if (this.#startedPointingAt !== this.#pointingAt) return;

    if (this.#pointingAt == null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
      return;
    }

    const index = this.#pointingAt;

    if (this.#editingMode === "add") {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index } }),
      );
    } else if (this.#editingMode === "remove") {
      window.dispatchEvent(
        new CustomEvent("remove-node", {
          detail: {
            index,
            position: [event.clientX, event.clientY],
          },
        }),
      );
    }
  };

  // TODO optimize via previousPointerAt
  refreshInstancesColors() {
    const current = new THREE.Color(0xffffff);

    if (this.#additions) {
      const unselected = new THREE.Color(0xffff00);
      const pointingAt = new THREE.Color(0x88ff88);
      const selected = new THREE.Color(0x00ff00);
      let needsUpdate = false;

      for (let i = 0; i < this.#additions.count; i++) {
        const color =
          this.#editingMode === "add" && i === this.#pointingAt
            ? pointingAt
            : this.#editingMode === "add" && this.#selectedIndexes.includes(i)
              ? selected
              : unselected;

        this.#additions.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#additions.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate) this.#additions.instanceColor!.needsUpdate = true;
    }

    if (this.#virtualGeometry) {
      const color = new THREE.Color(0xffff00);
      let needsUpdate = false;

      for (let i = 0; i < this.#virtualGeometry.count; i++) {
        this.#virtualGeometry.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#virtualGeometry.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate) this.#virtualGeometry.instanceColor!.needsUpdate = true;
    }

    if (this.#currentDistrict) {
      const unselected = new THREE.Color(0xffffff);
      const pointingAt = new THREE.Color(0x888888);
      let needsUpdate = false;

      for (let i = 0; i < this.#currentDistrict.count; i++) {
        const color =
          this.#editingMode === "remove" && this.#pointingAt === i
            ? pointingAt
            : unselected;

        this.#currentDistrict.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#currentDistrict.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate) this.#currentDistrict.instanceColor!.needsUpdate = true;
    }

    if (this.#currentDistrictRemovals) {
      const unselected = new THREE.Color(0xff00ff);
      const selected = new THREE.Color(0xffffff);
      let needsUpdate = false;

      for (let i = 0; i < this.#currentDistrictRemovals.count; i++) {
        const color =
          this.#editingMode === "remove" && this.#selectedIndexes.includes(i)
            ? selected
            : unselected;

        this.#currentDistrictRemovals.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#currentDistrictRemovals.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate)
        this.#currentDistrictRemovals.instanceColor!.needsUpdate = true;
    }
  }

  selectInstances(indexes: number[]) {
    this.#selectedIndexes = indexes;

    requestAnimationFrame(this.render);
  }

  setAdditions(data: DistrictWithTransforms) {
    this.#remove(this.#additions);
    this.#remove(this.#virtualGeometry);

    const { district, transforms } = data;
    const [real, virtual] = partition(transforms, (item) => !item.virtual);

    this.#additions = this.#add(
      createInstancedMeshForDistrict(district, real, additionsMaterial),
    );
    this.#virtualGeometry = this.#add(
      createInstancedMeshForDistrict(
        district,
        virtual,
        virtualEditsMaterial[this.#patternView],
      ),
    );

    requestAnimationFrame(this.render);
  }

  setCurrentDistrict(data: DistrictWithTransforms) {
    this.#remove(this.#currentDistrict);
    this.#remove(this.#currentDistrictRemovals);
    this.#remove(this.#currentDistrictBoundaries);

    const { district, transforms } = data;
    const hidden = transforms.filter((item) => item.hidden);
    const visible = transforms.map((item) =>
      item.hidden ? { ...item, scale: { x: 0, y: 0, z: 0, w: 1 } } : item,
    );
    this.#currentDistrict = this.#add(
      createInstancedMeshForDistrict(district, visible, buildingsMaterial),
    );
    this.#currentDistrictRemovals = this.#add(
      createInstancedMeshForDistrict(district, hidden, wireframeMaterial),
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
    this.#setVirtualGeometryMaterial();
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
    this.refreshInstancesColors();
    super.render();
    this.#canvasRect = this.canvas.getBoundingClientRect();
  };
}
