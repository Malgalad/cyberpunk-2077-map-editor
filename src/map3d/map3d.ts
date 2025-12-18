import * as THREE from "three";

import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictWithTransforms,
  InstancedMeshTransforms,
  MapNodeParsed,
  PatternView,
} from "../types/types.ts";
import { partition, toNumber } from "../utilities/utilities.ts";
import AxesHelper from "./axesHelper.ts";
import { ADDITIONS, BUILDINGS, DELETIONS, UPDATES } from "./colors.ts";
import { createDistrictMesh } from "./createDistrictMesh.ts";
import { Map3DBase } from "./map3d.base.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  hiddenMaterial,
  patternMaterial,
  staticMaterial,
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
  readonly #store: AppStore;
  readonly #unsubscribe: () => void;
  #visibleDistricts: THREE.Group = new THREE.Group();
  #currentDistrict: THREE.InstancedMesh | null = null;
  #currentDistrictBoundaries: THREE.BoxHelper | null = null;
  #additions: THREE.InstancedMesh | null = null;
  #additionsVirtual: THREE.InstancedMesh | null = null;
  #updates: THREE.InstancedMesh | null = null;
  #deletions: THREE.InstancedMesh | null = null;
  #selectedIndexes: number[] = [];
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #startedPointingAt: [number, THREE.Object3D] | null = null;
  #pointingAt: [number, THREE.Object3D] | null = null;
  #helper = new AxesHelper(50);
  #markers: string[] = [];

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    super(canvas);

    this.#raycaster = new THREE.Raycaster();
    this.#store = store;
    this.#canvasRect = this.canvas.getBoundingClientRect();

    setupTerrain(this.loadResource);
    this.scene.add(this.#visibleDistricts);
    this.scene.add(this.#helper);

    this.#unsubscribe = this.#store.subscribe(this.render);
    this.canvas.addEventListener("mousedown", this.#onMouseDown);
    this.canvas.addEventListener("mousemove", this.#onMouseMove);
    this.canvas.addEventListener("mouseleave", this.#onMouseLeave);
    this.canvas.addEventListener("click", this.#onClick);

    this.render();
  }

  dispose() {
    super.dispose();

    this.#unsubscribe();
    this.canvas.removeEventListener("mousedown", this.#onMouseDown);
    this.canvas.removeEventListener("mousemove", this.#onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.#onMouseLeave);
    this.canvas.removeEventListener("click", this.#onClick);

    this.#helper.dispose();
    this.#visibleDistricts.children.forEach((child) =>
      (child as THREE.InstancedMesh).geometry.dispose(),
    );
    this.#currentDistrict?.geometry.dispose();
    this.#currentDistrict?.dispose();
    this.#currentDistrictBoundaries?.geometry.dispose();
    this.#currentDistrictBoundaries?.dispose();
    this.#additions?.geometry.dispose();
    this.#additions?.dispose();
    this.#additionsVirtual?.geometry.dispose();
    this.#additionsVirtual?.dispose();
    this.#updates?.geometry.dispose();
    this.#updates?.dispose();
    this.#deletions?.geometry.dispose();
    this.#deletions?.dispose();
  }

  get #mode() {
    return ProjectSelectors.getMode(this.#store.getState());
  }

  get #patternView() {
    return OptionsSelectors.getPatternView(this.#store.getState());
  }

  get #tool() {
    return ProjectSelectors.getTool(this.#store.getState());
  }

  /** Add mesh to the scene */
  #add<T extends THREE.Object3D>(mesh: T): T {
    this.scene.add(mesh);
    return mesh;
  }

  /** Remove mesh from the scene and dispose of geometry */
  #remove(mesh?: THREE.Mesh | THREE.Line | null) {
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  }

  #onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || this.#tool !== "select") return;
    this.#startedPointingAt = this.#pointingAt;
  };

  #onMouseMove = (event: MouseEvent) => {
    const { left, top, width, height } = this.#canvasRect!;
    const mode = this.#mode;
    const tool = this.#tool;

    if (tool !== "select") return;

    this.#pointer.x = ((event.clientX - left) / width) * 2 - 1;
    this.#pointer.y = -((event.clientY - top) / height) * 2 + 1;

    if (mode === "create" && !this.#additions) return;
    if (mode === "update" && !this.#currentDistrict) return;
    if (mode === "delete" && !this.#currentDistrict) return;

    const meshes =
      mode === "create"
        ? [this.#additions!]
        : mode === "update"
          ? [this.#updates!, this.#currentDistrict!]
          : [this.#currentDistrict!];

    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const intersection = this.#raycaster.intersectObjects(meshes);
    const previousPointingAt = this.#pointingAt;

    if (intersection.length > 0) {
      const instanceId = intersection[0].instanceId;

      if (instanceId !== undefined) {
        this.#pointingAt = [instanceId, intersection[0].object];
      }
    } else {
      this.#pointingAt = null;
    }

    if (this.#pointingAt !== previousPointingAt)
      requestAnimationFrame(this.render);
  };

  #onMouseLeave = () => {
    this.#pointingAt = null;
    requestAnimationFrame(this.render);
  };

  #onClick = () => {
    const mode = this.#mode;

    if (
      this.#startedPointingAt?.[0] !== this.#pointingAt?.[0] ||
      this.#tool !== "select"
    )
      return;

    if (this.#pointingAt == null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
      return;
    }

    const index = this.#pointingAt[0];

    if (mode === "create") {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index } }),
      );
    } else if (mode === "delete") {
      window.dispatchEvent(
        new CustomEvent("remove-node", { detail: { index } }),
      );
    } else if (mode === "update") {
      if (this.#pointingAt[1] === this.#updates) {
        window.dispatchEvent(
          new CustomEvent("select-node", { detail: { index } }),
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("update-node", { detail: { index } }),
        );
      }
    }
  };

  // TODO optimize via previousPointerAt
  #refreshInstancesColors() {
    const current = new THREE.Color();
    const mode = this.#mode;

    if (this.#additions) {
      const instances: Array<InstancedMeshTransforms> =
        this.#additions.userData.instances;
      let needsUpdate = false;

      for (let i = 0; i < this.#additions.count; i++) {
        const id = instances[i].id ?? "";
        const isMarker = this.#markers.includes(id);
        const color =
          mode === "create" && this.#selectedIndexes.includes(i)
            ? isMarker
              ? DELETIONS.selected
              : ADDITIONS.selected
            : isMarker
              ? ADDITIONS.marker
              : mode === "create" && i === this.#pointingAt?.[0]
                ? ADDITIONS.pointingAt
                : ADDITIONS.default;

        this.#additions.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#additions.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate && this.#additions.instanceColor)
        this.#additions.instanceColor.needsUpdate = true;

      if (this.#additionsVirtual) {
        let needsUpdate = false;
        const origins: Array<InstancedMeshTransforms> =
          this.#additionsVirtual.userData.instances;

        for (let i = 0; i < this.#additionsVirtual.count; i++) {
          const originId = origins[i].originId ?? "";
          const index = instances.findIndex((k) => k.id === originId);
          const color =
            mode === "create" && this.#selectedIndexes.includes(index)
              ? ADDITIONS.selected
              : ADDITIONS.default;

          this.#additionsVirtual.getColorAt(i, current);
          if (!current.equals(color)) {
            this.#additionsVirtual.setColorAt(i, color);
            needsUpdate = true;
          }
        }

        if (needsUpdate && this.#additionsVirtual.instanceColor)
          this.#additionsVirtual.instanceColor.needsUpdate = true;
      }
    }

    if (this.#updates) {
      const instances: Array<InstancedMeshTransforms> =
        this.#updates.userData.instances;
      let needsUpdate = false;

      for (let i = 0; i < this.#updates.count; i++) {
        const index = instances[i] != null ? toNumber(instances[i].id) : -1;
        const color =
          mode === "update" && this.#selectedIndexes.includes(index)
            ? UPDATES.selected
            : mode === "update" &&
                i === this.#pointingAt?.[0] &&
                this.#updates === this.#pointingAt?.[1]
              ? UPDATES.pointingAt
              : UPDATES.default;

        this.#updates.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#updates.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate && this.#updates.instanceColor)
        this.#updates.instanceColor.needsUpdate = true;
    }

    if (this.#deletions) {
      const instances: Array<InstancedMeshTransforms> =
        this.#deletions.userData.instances;
      let needsUpdate = false;

      for (let i = 0; i < this.#deletions.count; i++) {
        const index = instances[i] != null ? toNumber(instances[i].id) : -1;
        const color =
          mode && this.#selectedIndexes.includes(index)
            ? DELETIONS.selected
            : DELETIONS.default;

        this.#deletions.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#deletions.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate && this.#deletions.instanceColor)
        this.#deletions.instanceColor.needsUpdate = true;
    }

    if (this.#currentDistrict) {
      let needsUpdate = false;

      for (let i = 0; i < this.#currentDistrict.count; i++) {
        const color =
          mode === "delete" && this.#pointingAt?.[0] === i
            ? BUILDINGS.pointingAtDeletion
            : mode === "update" && this.#pointingAt?.[0] === i
              ? BUILDINGS.pointingAtUpdate
              : BUILDINGS.default;

        this.#currentDistrict.getColorAt(i, current);
        if (!current.equals(color)) {
          this.#currentDistrict.setColorAt(i, color);
          needsUpdate = true;
        }
      }

      if (needsUpdate && this.#currentDistrict.instanceColor)
        this.#currentDistrict.instanceColor.needsUpdate = true;
    }
  }

  /** Apply selected material to virtual geometry */
  #refreshMaterials() {
    if (!this.#additionsVirtual) return;

    const next = virtualEditsMaterial[this.#patternView];
    if (this.#additionsVirtual.material !== next) {
      this.#additionsVirtual.material = next;
    }
  }

  clearPointer() {
    this.#pointingAt = null;
    this.#startedPointingAt = null;
    requestAnimationFrame(this.render);
  }

  lookAtCurrentDistrict() {
    if (!this.#currentDistrictBoundaries) return;

    this.#currentDistrictBoundaries.geometry.computeBoundingBox();
    this.lookAtBox(this.#currentDistrictBoundaries.geometry.boundingBox);

    requestAnimationFrame(this.render);
  }

  selectInstances(indexes: number[]) {
    this.#selectedIndexes = indexes;

    requestAnimationFrame(this.render);
  }

  setHelper(node?: MapNodeParsed, relative?: boolean) {
    if (!node) {
      this.#helper.visible = false;
      return;
    }

    this.#helper.position.set(
      node.position[0],
      node.position[2],
      -node.position[1],
    );
    if (node.type === "group") {
      this.#helper.scale.set(1.5, 1.5, 1.5);
    } else {
      this.#helper.scale.set(
        node.scale[0] / 50,
        node.scale[2] / 50,
        node.scale[1] / 50,
      );
    }
    if (relative) {
      this.#helper.rotation.fromArray([
        node.rotation[0],
        node.rotation[2],
        -node.rotation[1],
      ]);
    } else {
      this.#helper.rotation.set(0, 0, 0);
    }
    this.#helper.visible = true;
    requestAnimationFrame(this.render);
  }

  setAdditions({ district, transforms }: DistrictWithTransforms) {
    this.#remove(this.#additions);
    this.#remove(this.#additionsVirtual);

    this.#markers = transforms
      .filter(({ scale }) => scale.w === 0)
      .map(({ id }) => id);
    const [real, virtual] = partition(transforms, (item) => !item.virtual);

    this.#additions = this.#add(
      createDistrictMesh(district, real, additionsMaterial, ADDITIONS.default),
    );
    this.#additionsVirtual = this.#add(
      createDistrictMesh(
        district,
        virtual,
        virtualEditsMaterial[this.#patternView],
        ADDITIONS.default,
      ),
    );

    requestAnimationFrame(this.render);
  }

  setDeletions({ district, transforms }: DistrictWithTransforms) {
    this.#remove(this.#deletions);

    this.#deletions = this.#add(
      createDistrictMesh(
        district,
        transforms,
        wireframeMaterial,
        DELETIONS.default,
      ),
    );

    requestAnimationFrame(this.render);
  }

  setCurrentDistrict(data: DistrictWithTransforms) {
    this.#remove(this.#currentDistrict);
    this.#remove(this.#currentDistrictBoundaries);

    const { district, transforms } = data;
    this.#currentDistrict = this.#add(
      createDistrictMesh(
        district,
        transforms,
        buildingsMaterial,
        BUILDINGS.default,
      ),
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

    requestAnimationFrame(this.render);
  }

  setUpdates({ district, transforms }: DistrictWithTransforms) {
    this.#remove(this.#updates);

    this.#updates = this.#add(
      createDistrictMesh(
        district,
        transforms,
        additionsMaterial,
        UPDATES.default,
      ),
    );

    requestAnimationFrame(this.render);
  }

  setVisibleDistricts(districts: DistrictWithTransforms[]) {
    const visibleNames = districts.map((item) => item.district.name);

    const objectsToRemove: THREE.Object3D[] = [];
    for (const object3d of this.#visibleDistricts.children) {
      const { name } = object3d;

      if (!visibleNames.includes(name)) {
        objectsToRemove.push(object3d);
        (object3d as THREE.InstancedMesh).geometry.dispose();
      }
    }
    if (objectsToRemove.length > 0)
      this.#visibleDistricts.remove(...objectsToRemove);

    const currentNames = this.#visibleDistricts.children.map(
      (object3d) => object3d.name,
    );

    const objectsToAdd: THREE.Object3D[] = [];
    for (const item of districts) {
      const { district, transforms } = item;

      if (!currentNames.includes(district.name)) {
        const mesh = createDistrictMesh(district, transforms, staticMaterial);
        mesh.name = district.name;
        objectsToAdd.push(mesh);
      }
    }
    if (objectsToAdd.length > 0) this.#visibleDistricts.add(...objectsToAdd);

    requestAnimationFrame(this.render);
  }

  reset = () => {
    this.#remove(this.#additions);
    this.#remove(this.#additionsVirtual);
    this.#remove(this.#currentDistrict);
    this.#remove(this.#currentDistrictBoundaries);
    this.#remove(this.#deletions);
    this.#remove(this.#updates);

    for (const object3d of this.#visibleDistricts.children) {
      (object3d as THREE.InstancedMesh).geometry.dispose();
    }
    this.#visibleDistricts.remove(...this.#visibleDistricts.children);
  };

  render = () => {
    this.toggleControls(this.#tool === "move");
    this.#refreshInstancesColors();
    this.#refreshMaterials();
    super.render();
    this.#canvasRect = this.canvas.getBoundingClientRect();
  };

  getCenter = () => {
    const terrain = this.scene.getObjectByName("terrain_mesh");

    if (!terrain) throw new Error("Terrain mesh not found");

    this.#raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersection = this.#raycaster.intersectObject(terrain);

    if (!intersection.length) throw new Error("No terrain intersection");

    const [{ point }] = intersection;

    return [point.x, -point.z, point.y];
  };
}
