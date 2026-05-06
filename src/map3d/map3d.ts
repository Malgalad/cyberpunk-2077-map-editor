import * as THREE from "three";

import { NodesActions } from "../store/nodes.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictWithTransforms,
  MapNode,
} from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import * as COLORS from "./colors.ts";
import CurrentDistrict from "./CurrentDistrict.ts";
import Helper from "./Helper.ts";
import { Map3DBase } from "./map3d.base.ts";
import Markers from "./Markers.ts";
import {
  additionsMaterial,
  buildingsMaterial,
  wireframeMaterial,
} from "./materials.ts";
import Selectable from "./Selectable.ts";
import StaticDistricts from "./StaticDistricts.ts";
import StaticMeshes from "./StaticMeshes.ts";

const selectors = {
  tool: ProjectSelectors.getTool,
  mode: ProjectSelectors.getMode,
} as const;

export class Map3D extends Map3DBase {
  private readonly current: CurrentDistrict;
  private readonly helper: Helper;
  private readonly markers: Markers;
  private readonly selectable: Selectable;
  private readonly staticDistricts: StaticDistricts;
  private readonly staticMeshes: StaticMeshes;
  private readonly store: AppStore;
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private currentDistrictBoundaries: THREE.BoxHelper | null = null;
  private raf: number | undefined;

  constructor(canvas: HTMLCanvasElement, store: AppStore) {
    super(canvas, store);

    this.store = store;

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    this.current = new CurrentDistrict(store);
    this.current.addEventListener("updated", this.update);
    this.addMesh(this.current);

    this.helper = new Helper(store, this.camera);
    this.onZoomChange(this.helper.onUpdate);
    this.addMesh(this.helper);

    this.markers = new Markers(store, this.camera);
    this.markers.addEventListener("updated", this.update);
    this.onZoomChange(this.markers.onUpdate);
    this.addMesh(this.markers);

    this.selectable = new Selectable(this.canvas, this.camera);
    this.selectable.add(this.current);
    this.selectable.add(this.markers);

    this.staticDistricts = new StaticDistricts();
    this.staticDistricts.addEventListener("updated", this.update);
    this.addMesh(this.staticDistricts);

    this.staticMeshes = new StaticMeshes(store);
    this.staticMeshes.addEventListener("visibilityChanged", this.update);
    this.addMesh(this.staticMeshes);

    this.canvas.addEventListener("click", this.onClick);

    this.render();
  }

  dispose() {
    super.dispose();
    this.state.dispose();
    this.current.dispose();
    this.helper.dispose();
    this.markers.dispose();
    this.selectable.dispose();
    this.staticDistricts.dispose();
    this.staticMeshes.dispose();

    this.canvas.removeEventListener("click", this.onClick);
  }

  private onClick = () => {
    if (this.state.tool !== "select") return;

    const intersection = this.selectable.intersection;

    if (!intersection) {
      this.store.dispatch(NodesActions.selectNode(null));
      return;
    }

    const { object, instanceId } = intersection;
    if (object instanceof THREE.InstancedMesh && instanceId == null) return;

    const mode = this.state.mode;

    if (object instanceof THREE.Sprite) {
      this.store.dispatch(NodesActions.selectNode(object.userData.id));
    } else if (
      mode === "create" ||
      (mode === "update" && object.name === "updates") ||
      (mode === "delete" && object.name === "deletions")
    ) {
      const { id } = object.userData.instances[instanceId!];
      this.store.dispatch(NodesActions.selectNode(id));
    } else if (mode === "delete" && object.name === "currentDistrict") {
      this.store.dispatch(NodesActions.addDistrictNode(instanceId!, "delete"));
    } else if (mode === "update" && object.name === "currentDistrict") {
      this.store.dispatch(NodesActions.addDistrictNode(instanceId!, "update"));
    }
  };

  lookAtCurrentDistrict() {
    if (!this.currentDistrictBoundaries) return;

    this.currentDistrictBoundaries.geometry.computeBoundingBox();
    this.lookAtBox(this.currentDistrictBoundaries.geometry.boundingBox);

    this.update();
  }

  setMarkers(markers: MapNode[]) {
    this.markers.setMarkers(markers);
  }

  setAdditions({ district, transforms }: DistrictWithTransforms) {
    this.current.setMesh(
      "additions",
      district,
      transforms,
      additionsMaterial,
      COLORS.ADDITIONS.default,
    );
    this.update();
  }

  setAdditionsVirtual({ district, transforms }: DistrictWithTransforms) {
    this.current.setMesh(
      "additionsVirtual",
      district,
      transforms,
      additionsMaterial,
      COLORS.ADDITIONS.default,
    );
    this.update();
  }

  setDeletions({ district, transforms }: DistrictWithTransforms) {
    this.current.setMesh(
      "deletions",
      district,
      transforms,
      wireframeMaterial,
      COLORS.DELETIONS.default,
    );
    this.update();
  }

  setCurrentDistrict({ district, transforms }: DistrictWithTransforms) {
    this.removeMesh(this.currentDistrictBoundaries);

    this.current.setMesh(
      "currentDistrict",
      district,
      transforms,
      buildingsMaterial,
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
    this.currentDistrictBoundaries = this.addMesh(
      new THREE.BoxHelper(minMaxBox, 0xff8800),
    );

    this.update();
  }

  setUpdates({ district, transforms }: DistrictWithTransforms) {
    this.current.setMesh(
      "updates",
      district,
      transforms,
      additionsMaterial,
      COLORS.UPDATES.default,
    );
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
