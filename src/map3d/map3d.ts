import * as THREE from "three";

import { NodesActions } from "../store/nodes.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictWithTransforms,
  MapNode,
} from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { partition } from "../utilities/utilities.ts";
import AxesHelper from "./axesHelper.ts";
import * as COLORS from "./colors.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import { createDistrictMesh } from "./createDistrictMesh.ts";
import CurrentDistrict from "./CurrentDistrict.ts";
import { Map3DBase } from "./map3d.base.ts";
import Markers from "./Markers.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  wireframeMaterial,
} from "./materials.ts";
import StaticDistricts from "./StaticDistricts.ts";
import StaticMeshes from "./StaticMeshes.ts";

const selectors = {
  tool: ProjectSelectors.getTool,
  mode: ProjectSelectors.getMode,
} as const;

export class Map3D extends Map3DBase {
  private readonly current: CurrentDistrict;
  private readonly markers: Markers;
  private readonly staticDistricts: StaticDistricts;
  private readonly staticMeshes: StaticMeshes;
  private readonly store: AppStore;
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private currentDistrict: THREE.InstancedMesh | null = null;
  private currentDistrictBoundaries: THREE.BoxHelper | null = null;
  private additions: THREE.InstancedMesh | null = null;
  private additionsVirtual: THREE.InstancedMesh | null = null;
  private updates: THREE.InstancedMesh | null = null;
  private deletions: THREE.InstancedMesh | null = null;
  private canvasRect: DOMRect | null = null;
  private helper = new AxesHelper(50);
  private raf: number | undefined;

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    super(canvas, store);

    this.store = store;

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    this.canvasRect = this.canvas.getBoundingClientRect();

    this.staticMeshes = new StaticMeshes(store);
    this.staticMeshes.addEventListener("visibilityChanged", this.update);
    this.addMesh(this.staticMeshes);

    this.current = new CurrentDistrict(store);
    this.current.addEventListener("updated", this.update);
    this.addMesh(this.current);

    this.markers = new Markers(store, this.camera);
    this.markers.addEventListener("updated", this.update);
    this.onZoomChange(() =>
      this.markers.dispatchEvent({ type: "zoomChanged" }),
    );
    this.addMesh(this.markers);

    this.staticDistricts = new StaticDistricts();
    this.staticDistricts.addEventListener("updated", this.update);
    this.addMesh(this.staticDistricts);

    this.addMesh(this.helper);
    this.addMesh(this.markers);

    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseleave", this.onMouseLeave);
    this.canvas.addEventListener("click", this.onClick);

    this.render();
  }

  dispose() {
    super.dispose();
    this.state.dispose();
    this.staticDistricts.dispose();
    this.staticMeshes.dispose();
    this.current.dispose();
    this.markers.dispose();

    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
    this.canvas.removeEventListener("mouseup", this.onClick);

    this.helper.dispose();
  }

  private getPointer(event: MouseEvent) {
    const { left, top, width, height } = this.canvasRect!;
    return new THREE.Vector2(
      ((event.clientX - left) / width) * 2 - 1,
      -((event.clientY - top) / height) * 2 + 1,
    );
  }

  private onMouseMove = (event: MouseEvent) => {
    this.current.intersect(this.getPointer(event), this.camera);
  };

  private onMouseLeave = () => {
    this.current.intersect(new THREE.Vector2(9999, 9999), this.camera);
  };

  private onClick = () => {
    if (this.state.tool !== "select") return;

    const intersection = this.current.findIntersection();

    if (!intersection) {
      this.store.dispatch(NodesActions.selectNode(null));
      return;
    }

    const { object, instanceId } = intersection;
    if (instanceId == null) return;

    const mode = this.state.mode;
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

  lookAtCurrentDistrict() {
    if (!this.currentDistrictBoundaries) return;

    this.currentDistrictBoundaries.geometry.computeBoundingBox();
    this.lookAtBox(this.currentDistrictBoundaries.geometry.boundingBox);

    this.update();
  }

  setHelper(node?: MapNode, relative?: boolean) {
    if (!node) {
      this.helper.visible = false;
      this.update();
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

    this.update();
  }

  setMarkers(markers: MapNode[]) {
    this.markers.setMarkers(markers);
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
    this.current.setMesh("additions", this.additions);
    this.additionsVirtual = createDistrictMesh(
      this.additionsVirtual,
      district,
      split["true"] ?? [],
      additionsMaterial,
      COLORS.ADDITIONS.default,
    );
    this.current.setMesh("additionsVirtual", this.additionsVirtual);

    this.update();
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
    this.current.setMesh("deletions", this.deletions);

    this.update();
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
    this.current.setMesh("currentDistrict", this.currentDistrict);

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

    this.update();
  }

  setUpdates({ district, transforms }: DistrictWithTransforms) {
    this.updates = createDistrictMesh(
      this.updates,
      district,
      transforms,
      additionsMaterial,
      COLORS.UPDATES.default,
    );
    this.current.setMesh("updates", this.updates);

    this.update();
  }

  setVisibleDistricts(districts: DistrictWithTransforms[]) {
    this.staticDistricts.setStaticDistricts(districts);
  }

  reset() {
    this.current.clear();
    this.markers.clear();

    this.update();
  }

  update = () => {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.render());
  };

  render() {
    this.toggleControls(this.state.tool === "move");
    super.render();
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  getCenter() {
    const terrain = this.scene.getObjectByName("terrain_mesh");

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
