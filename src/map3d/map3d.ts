import * as THREE from "three";

import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictWithTransforms,
  InstancedMeshTransforms,
  MapNodeV2,
  Modes,
  PatternView,
} from "../types/types.ts";
import { partition } from "../utilities/utilities.ts";
import AxesHelper from "./axesHelper.ts";
import * as COLORS from "./colors.ts";
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
const isMarker = ({ scale: { w } }: InstancedMeshTransforms) => w === 0;

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
  #selected: string[] = [];
  #canvasRect: DOMRect | null = null;
  #pointer: THREE.Vector2 = new THREE.Vector2(1, 1);
  #startedPointingAt: [InstancedMeshTransforms, THREE.InstancedMesh] | null =
    null;
  #pointingAt: [InstancedMeshTransforms, THREE.InstancedMesh] | null = null;
  #helper = new AxesHelper(50);
  #markers: string[] = [];
  #uncolorList: Array<[THREE.InstancedMesh, string, THREE.Color]> = [];
  #meshes: Record<string, THREE.Mesh | THREE.Mesh[] | undefined> = {};

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    super(canvas);

    this.#raycaster = new THREE.Raycaster();
    this.#store = store;
    this.#canvasRect = this.canvas.getBoundingClientRect();

    this.#meshes = setupTerrain(this.loadResource);
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

  get #visibleMeshes() {
    return OptionsSelectors.getVisibleMeshes(this.#store.getState());
  }

  get #tool() {
    return ProjectSelectors.getTool(this.#store.getState());
  }

  /** Add mesh to the scene */
  #add = <T extends THREE.Object3D>(mesh: T): T => {
    this.scene.add(mesh);
    return mesh;
  };

  /** Remove mesh from the scene and dispose of geometry */
  #remove = (mesh?: THREE.Mesh | THREE.Line | null) => {
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
  };

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
          : event.shiftKey
            ? [this.#deletions!, this.#currentDistrict!]
            : [this.#currentDistrict!];

    this.#raycaster.setFromCamera(this.#pointer, this.camera);
    const intersection = this.#raycaster.intersectObjects(meshes);
    const previousPointingAt = this.#pointingAt;

    if (intersection.length > 0) {
      const index = intersection[0].instanceId;

      if (index !== undefined) {
        const mesh = intersection[0].object;
        if (!("ids" in mesh.userData)) return;
        const instance = intersection[0].object.userData.instances[index];

        this.#pointingAt = [instance, mesh as THREE.InstancedMesh];
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

    if (this.#startedPointingAt !== this.#pointingAt || this.#tool !== "select")
      return;

    if (this.#pointingAt == null) {
      window.dispatchEvent(
        new CustomEvent("select-node", { detail: { index: null } }),
      );
      return;
    }

    const [{ id, index }, mesh] = this.#pointingAt;
    let eventType: "select-node" | "update-node" | "remove-node";
    let detail: { id: string } | { index: number };

    if (
      mode === "create" ||
      (mode === "update" && mesh === this.#updates) ||
      (mode === "delete" && mesh === this.#deletions)
    ) {
      eventType = "select-node";
      detail = { id };
    } else if (mode === "delete" && mesh === this.#currentDistrict) {
      eventType = "remove-node";
      detail = { index };
    } else if (mode === "update" && mesh === this.#currentDistrict) {
      eventType = "update-node";
      detail = { index };
    }

    // @ts-expect-error they will be initialized 100%
    if (eventType && detail) {
      window.dispatchEvent(new CustomEvent(eventType, { detail }));
    }
  };

  #refreshInstancesColors() {
    const mode = this.#mode;

    const meshes: Record<Modes, THREE.InstancedMesh | null> = {
      create: this.#additions,
      update: this.#updates,
      delete: this.#deletions,
    };

    for (const [mesh, id, color] of this.#uncolorList) {
      COLORS.setColorForId(mesh, id, color);
    }
    this.#uncolorList = [];

    const applyColor = (
      mesh: THREE.InstancedMesh,
      id: string,
      variant: "selected" | "pointingAt",
    ) => {
      const color = COLORS.getColor(
        mesh === this.#currentDistrict,
        this.#markers.includes(id),
        mode,
      );
      COLORS.setColorForId(mesh, id, color[variant]);

      this.#uncolorList.push([mesh, id, color.idle]);
    };

    if (meshes[mode]) {
      if (this.#selected.length) {
        const mesh = meshes[mode];

        for (const id of this.#selected) {
          applyColor(mesh, id, "selected");
        }

        if (mode === "create" && this.#additionsVirtual) {
          const mesh = this.#additionsVirtual;

          for (const id of this.#selected) {
            if (!mesh.userData.ids[id]) continue;
            applyColor(mesh, id, "selected");
          }
        }
      }

      if (this.#pointingAt !== null) {
        const [{ id }, mesh] = this.#pointingAt;
        if (this.#selected.includes(id)) return;
        applyColor(mesh, id, "pointingAt");
      }
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

  #refreshMeshes() {
    for (const [key, value] of Object.entries(this.#meshes)) {
      if (value === undefined) continue;
      const mesh = this.#meshes[key]!;
      if (Array.isArray(mesh)) {
        mesh.forEach(
          (item) => (item.visible = this.#visibleMeshes.includes(key)),
        );
      } else {
        mesh.visible = this.#visibleMeshes.includes(key);
      }
    }
  }

  #markMarkers() {
    if (this.#additions) {
      const mesh = this.#additions;
      for (const id of this.#markers) {
        COLORS.setColorForId(mesh, id, COLORS.MARKERS.default);
      }
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

  selectInstances(ids: string[]) {
    this.#selected = ids;

    requestAnimationFrame(this.render);
  }

  setHelper(node?: MapNodeV2, relative?: boolean) {
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
    this.#markers = transforms.filter(isMarker).map(({ id }) => id);

    const split = partition(transforms, (transform) => `${transform.virtual}`);

    this.#additions = createDistrictMesh(
      this.#additions,
      district,
      split["false"] ?? [],
      additionsMaterial,
      this.#remove,
      this.#add,
      COLORS.ADDITIONS.default,
    );
    this.#markMarkers();
    this.#additionsVirtual = createDistrictMesh(
      this.#additionsVirtual,
      district,
      split["true"] ?? [],
      virtualEditsMaterial[this.#patternView],
      this.#remove,
      this.#add,
      COLORS.ADDITIONS.default,
    );

    requestAnimationFrame(this.render);
  }

  setDeletions({ district, transforms }: DistrictWithTransforms) {
    this.#deletions = createDistrictMesh(
      this.#deletions,
      district,
      transforms,
      wireframeMaterial,
      this.#remove,
      this.#add,
      COLORS.DELETIONS.default,
    );

    requestAnimationFrame(this.render);
  }

  setCurrentDistrict(data: DistrictWithTransforms) {
    this.#remove(this.#currentDistrictBoundaries);

    const { district, transforms } = data;
    this.#currentDistrict = createDistrictMesh(
      this.#currentDistrict,
      district,
      transforms,
      buildingsMaterial,
      this.#remove,
      this.#add,
      COLORS.BUILDINGS.default,
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
    this.#updates = createDistrictMesh(
      this.#updates,
      district,
      transforms,
      additionsMaterial,
      this.#remove,
      this.#add,
      COLORS.UPDATES.default,
    );

    requestAnimationFrame(this.render);
  }

  setVisibleDistricts(districts: DistrictWithTransforms[]) {
    const visibleNames = districts.map((item) => item.district.name);

    const objectsToRemove: THREE.Object3D[] = [];
    for (
      let index = 0;
      index < this.#visibleDistricts.children.length;
      index++
    ) {
      const object3d = this.#visibleDistricts.children[index];
      const { name } = object3d;

      if (!visibleNames.includes(name)) {
        objectsToRemove.push(object3d);
        (object3d as THREE.InstancedMesh).geometry.dispose();
      } else {
        const { district, transforms } = districts.find(
          (item) => item.district.name === name,
        )!;

        this.#visibleDistricts.children[index] = createDistrictMesh(
          this.#visibleDistricts.children[index] as THREE.InstancedMesh,
          district,
          transforms,
          staticMaterial,
        );
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
        const mesh = createDistrictMesh(
          null,
          district,
          transforms,
          staticMaterial,
        );
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
    this.#markers = [];
    this.#uncolorList = [];
    this.#pointingAt = null;
    this.#startedPointingAt = null;

    for (const object3d of this.#visibleDistricts.children) {
      (object3d as THREE.InstancedMesh).geometry.dispose();
    }
    this.#visibleDistricts.remove(...this.#visibleDistricts.children);
  };

  render = () => {
    this.toggleControls(this.#tool === "move");
    this.#refreshInstancesColors();
    this.#refreshMaterials();
    this.#refreshMeshes();
    super.render();
    this.#canvasRect = this.canvas.getBoundingClientRect();
  };

  getCenter = () => {
    const terrain = this.#meshes["terrain_mesh"];

    if (!terrain) throw new Error("Terrain mesh not found");
    if (Array.isArray(terrain))
      throw new Error("Multiple terrain meshes found");

    this.#raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersection = this.#raycaster.intersectObject(terrain);

    if (!intersection.length) throw new Error("No terrain intersection");

    const [{ point }] = intersection;

    return [point.x, -point.z, point.y];
  };
}
