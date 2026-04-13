import * as THREE from "three";

import { NodesActions } from "../store/nodes.ts";
import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictWithTransforms,
  MapNode,
  PatternView,
} from "../types/types.ts";
import { partition } from "../utilities/utilities.ts";
import AxesHelper from "./axesHelper.ts";
import * as COLORS from "./colors.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import { createDistrictMesh } from "./createDistrictMesh.ts";
import { Map3DBase } from "./map3d.base.ts";
import Map3DState from "./map3d.state.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  hiddenMaterial,
  patternMaterial,
  spriteMaterial,
  spriteMaterial2,
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
  private readonly state: Map3DState;
  private readonly meshes: Record<
    string,
    THREE.Mesh | THREE.Mesh[] | undefined
  > = {};
  private visibleDistricts: THREE.Group = new THREE.Group();
  private currentDistrict: THREE.InstancedMesh | null = null;
  private currentDistrictBoundaries: THREE.BoxHelper | null = null;
  private additions: THREE.InstancedMesh | null = null;
  private additionsVirtual: THREE.InstancedMesh | null = null;
  private updates: THREE.InstancedMesh | null = null;
  private deletions: THREE.InstancedMesh | null = null;
  private canvasRect: DOMRect | null = null;
  private clickOn: THREE.Intersection | undefined;
  private helper = new AxesHelper(50);
  private markers = new THREE.Group();
  private markerData: MapNode[] = [];

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    super(canvas, store);

    this.canvasRect = this.canvas.getBoundingClientRect();

    this.meshes = setupTerrain(this.loadResource);
    this.addMesh(this.visibleDistricts);
    this.addMesh(this.helper);
    this.addMesh(this.markers);

    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseleave", this.onMouseLeave);
    this.canvas.addEventListener("click", this.onMouseUp);

    this.state = new Map3DState(store);
    this.state.addEventListener("update", () =>
      requestAnimationFrame(() => this.render()),
    );
    this.addMesh(this.state.group);

    this.render();
  }

  dispose() {
    super.dispose();
    this.state.dispose();

    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);

    this.helper.dispose();
    this.visibleDistricts.children.forEach((child) =>
      (child as THREE.InstancedMesh).geometry.dispose(),
    );
    this.currentDistrict?.geometry.dispose();
    this.currentDistrict?.dispose();
    this.currentDistrictBoundaries?.geometry.dispose();
    this.currentDistrictBoundaries?.dispose();
    this.additions?.geometry.dispose();
    this.additions?.dispose();
    this.additionsVirtual?.geometry.dispose();
    this.additionsVirtual?.dispose();
    this.updates?.geometry.dispose();
    this.updates?.dispose();
    this.deletions?.geometry.dispose();
    this.deletions?.dispose();
  }

  private get mode() {
    return ProjectSelectors.getMode(this.store.getState());
  }

  private get patternView() {
    return OptionsSelectors.getPatternView(this.store.getState());
  }

  private get visibleMeshes() {
    return OptionsSelectors.getVisibleMeshes(this.store.getState());
  }

  private get tool() {
    return ProjectSelectors.getTool(this.store.getState());
  }

  private get effects() {
    return OptionsSelectors.getEffects(this.store.getState());
  }

  private getPointer(event: MouseEvent) {
    const { left, top, width, height } = this.canvasRect!;
    return new THREE.Vector2(
      ((event.clientX - left) / width) * 2 - 1,
      -((event.clientY - top) / height) * 2 + 1,
    );
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || this.tool !== "select") return;
    this.state.intersect(this.getPointer(event), this.camera);
    this.clickOn = this.state.findIntersection();
  };

  private onMouseMove = (event: MouseEvent) => {
    this.state.intersect(this.getPointer(event), this.camera);
  };

  private onMouseLeave = () => {
    this.state.intersect(new THREE.Vector2(9999, 9999), this.camera);
  };

  private onMouseUp = (event: MouseEvent) => {
    if (this.tool !== "select") return;

    const mode = this.mode;
    this.state.intersect(this.getPointer(event), this.camera);
    const intersection = this.state.findIntersection();

    if (!this.clickOn && !intersection) {
      this.store.dispatch(NodesActions.selectNode(null));
      return;
    }

    if (
      !intersection ||
      this.clickOn?.object !== intersection.object ||
      this.clickOn?.instanceId !== intersection.instanceId
    )
      return;

    const { object, instanceId } = intersection;
    if (!instanceId) return;

    if (
      mode === "create" ||
      (mode === "update" && object.name === "updates") ||
      (mode === "delete" && object.name === "deletions")
    ) {
      const { id } = object.userData.instances[instanceId];
      this.store.dispatch(NodesActions.selectNode(id));
    } else if (mode === "delete" && object.name === "currentDistrict") {
      this.store.dispatch(NodesActions.addDistrictNode(instanceId, "delete"));
    } else if (mode === "update" && object.name === "currentDistrict") {
      this.store.dispatch(NodesActions.addDistrictNode(instanceId, "update"));
    }
  };

  /** Apply selected material to virtual geometry */
  private refreshMaterials() {
    if (!this.additionsVirtual) return;

    const patternView = this.patternView;
    const next = virtualEditsMaterial[patternView];
    if (this.additionsVirtual.material !== next) {
      this.additionsVirtual.material = next;
    }
    if (patternView !== "solid") {
      this.additionsVirtual.layers.set(EXCLUDE_AO_LAYER);
    } else {
      this.additionsVirtual.layers.set(0);
    }
  }

  private refreshMeshes() {
    for (const [key, value] of Object.entries(this.meshes)) {
      if (value === undefined) continue;
      const mesh = this.meshes[key]!;
      if (Array.isArray(mesh)) {
        mesh.forEach(
          (item) => (item.visible = this.visibleMeshes.includes(key)),
        );
      } else {
        mesh.visible = this.visibleMeshes.includes(key);
      }
    }
  }

  private renderMarkers() {
    this.markers.clear();

    for (const marker of this.markerData) {
      const sprite = new THREE.Sprite(spriteMaterial.clone());
      const scale = 100 / this.camera.zoom / window.devicePixelRatio;
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(
        marker.position[0],
        marker.position[2],
        -marker.position[1],
      );
      sprite.layers.set(EXCLUDE_AO_LAYER);
      sprite.userData.id = marker.id;
      const spriteCopy = sprite.clone();
      spriteCopy.material = spriteMaterial2.clone();
      this.markers.add(sprite, spriteCopy);
    }
  }

  lookAtCurrentDistrict() {
    if (!this.currentDistrictBoundaries) return;

    this.currentDistrictBoundaries.geometry.computeBoundingBox();
    this.lookAtBox(this.currentDistrictBoundaries.geometry.boundingBox);

    requestAnimationFrame(() => this.render());
  }

  setHelper(node?: MapNode, relative?: boolean) {
    if (!node) {
      this.helper.visible = false;
      requestAnimationFrame(() => this.render());
      return;
    }

    this.helper.position.set(
      node.position[0],
      node.position[2],
      -node.position[1],
    );
    if (node.type === "group") {
      this.helper.scale.set(1.5, 1.5, 1.5);
    } else {
      this.helper.scale.set(
        node.scale[0] / 50,
        node.scale[2] / 50,
        node.scale[1] / 50,
      );
    }
    if (relative) {
      this.helper.rotation.fromArray([
        node.rotation[0],
        node.rotation[2],
        -node.rotation[1],
      ]);
    } else {
      this.helper.rotation.set(0, 0, 0);
    }
    this.helper.visible = true;
    requestAnimationFrame(() => this.render());
  }

  setMarkers(markers: MapNode[]) {
    this.markerData = markers;
  }

  setAdditions({ district, transforms }: DistrictWithTransforms) {
    const split = partition(transforms, (transform) => `${transform.virtual}`);

    this.additions = createDistrictMesh(
      this.additions,
      district,
      split["false"] ?? [],
      additionsMaterial,
      COLORS.ADDITIONS.default,
    );
    this.state.setMesh("additions", this.additions);
    this.additionsVirtual = createDistrictMesh(
      this.additionsVirtual,
      district,
      split["true"] ?? [],
      virtualEditsMaterial[this.patternView],
      COLORS.ADDITIONS.default,
    );
    this.state.setMesh("additionsVirtual", this.additionsVirtual);

    requestAnimationFrame(() => this.render());
  }

  setDeletions({ district, transforms }: DistrictWithTransforms) {
    this.deletions = createDistrictMesh(
      this.deletions,
      district,
      transforms,
      wireframeMaterial,
      COLORS.DELETIONS.default,
    );
    this.deletions.layers.set(EXCLUDE_AO_LAYER);
    this.state.setMesh("deletions", this.deletions);

    requestAnimationFrame(() => this.render());
  }

  setCurrentDistrict(data: DistrictWithTransforms) {
    this.removeMesh(this.currentDistrictBoundaries);

    const { district, transforms } = data;
    this.currentDistrict = createDistrictMesh(
      this.currentDistrict,
      district,
      transforms,
      buildingsMaterial,
      COLORS.BUILDINGS.default,
    );
    this.state.setMesh("currentDistrict", this.currentDistrict);

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
    this.currentDistrictBoundaries = this.addMesh(
      new THREE.BoxHelper(minMaxBox, 0xff8800),
    );

    requestAnimationFrame(() => this.render());
  }

  setUpdates({ district, transforms }: DistrictWithTransforms) {
    this.updates = createDistrictMesh(
      this.updates,
      district,
      transforms,
      additionsMaterial,
      COLORS.UPDATES.default,
    );
    this.state.setMesh("updates", this.updates);

    requestAnimationFrame(() => this.render());
  }

  setVisibleDistricts(districts: DistrictWithTransforms[]) {
    const visibleNames = districts.map((item) => item.district.name);

    const objectsToRemove: THREE.Object3D[] = [];
    for (
      let index = 0;
      index < this.visibleDistricts.children.length;
      index++
    ) {
      const object3d = this.visibleDistricts.children[index];
      const { name } = object3d;

      if (!visibleNames.includes(name)) {
        objectsToRemove.push(object3d);
        (object3d as THREE.InstancedMesh).geometry.dispose();
      } else {
        const { district, transforms } = districts.find(
          (item) => item.district.name === name,
        )!;

        this.visibleDistricts.children[index] = createDistrictMesh(
          this.visibleDistricts.children[index] as THREE.InstancedMesh,
          district,
          transforms,
          staticMaterial,
        );
      }
    }
    if (objectsToRemove.length > 0)
      this.visibleDistricts.remove(...objectsToRemove);

    const currentNames = this.visibleDistricts.children.map(
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
    if (objectsToAdd.length > 0) this.visibleDistricts.add(...objectsToAdd);
    this.state.setMesh("visibleDistricts", this.visibleDistricts);

    requestAnimationFrame(() => this.render());
  }

  reset() {
    this.state.clear();
    this.markers.clear();
    this.clickOn = undefined;

    for (const object3d of this.visibleDistricts.children) {
      (object3d as THREE.InstancedMesh).geometry.dispose();
    }
    this.visibleDistricts.remove(...this.visibleDistricts.children);
    this.render();
  }

  render() {
    this.toggleControls(this.tool === "move");
    this.toggleEffects(this.effects);
    this.renderMarkers();
    this.state?.render();
    this.refreshMaterials();
    this.refreshMeshes();
    super.render();
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  getCenter() {
    const terrain = this.meshes["terrain_mesh"];

    if (!terrain) throw new Error("Terrain mesh not found");
    if (Array.isArray(terrain))
      throw new Error("Multiple terrain meshes found");

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersection = raycaster.intersectObject(terrain);

    if (!intersection.length) throw new Error("No terrain intersection");

    const [{ point }] = intersection;

    return [point.x, -point.z, point.y];
  }
}
