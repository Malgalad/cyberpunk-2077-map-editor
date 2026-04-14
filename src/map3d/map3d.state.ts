import { shallowEqual } from "react-redux";
import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import { ProjectSelectors } from "../store/project.ts";
import type { AppStore } from "../types/types.ts";
import Stateful from "./@Stateful.ts";
import { getColor } from "./colors.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import type { KnownInstancedMeshNames } from "./types.ts";

const selectors = {
  mode: ProjectSelectors.getMode,
  tool: ProjectSelectors.getTool,
  selected: NodesSelectors.getSelectedNodesDeep,
} as const;

class Map3DState extends Stateful<typeof selectors> {
  private readonly raycaster = new THREE.Raycaster();
  private readonly meshMap = new Map<KnownInstancedMeshNames, THREE.Object3D>();
  private intersections: THREE.Intersection[] = [];
  private intersectionIndex = 0;
  readonly group = new THREE.Group();

  constructor(store: AppStore) {
    super(store, selectors);

    this.group.name = "StateMeshes";
    this.raycaster.layers.enable(EXCLUDE_AO_LAYER);
    document.addEventListener("keyup", this.changeIntersectionIndex);
    document.addEventListener("wheel", this.changeIntersectionIndex);
  }

  dispose() {
    super.dispose();
    document.removeEventListener("keyup", this.changeIntersectionIndex);
    document.removeEventListener("wheel", this.changeIntersectionIndex);
  }

  clear() {
    this.group.clear();
    this.meshMap.clear();
  }

  private changeIntersectionIndex = (event: KeyboardEvent | WheelEvent) => {
    const min = 0;
    const max = this.intersections.length - 1;

    if (min === max) return;

    if (
      (event instanceof KeyboardEvent &&
        (event.code === "ArrowUp" || event.code === "KeyC")) ||
      (event instanceof WheelEvent && event.deltaY > 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === max ? min : this.intersectionIndex + 1;
      this.dispatchEvent(new Event("update"));
    }

    if (
      (event instanceof KeyboardEvent &&
        (event.code === "ArrowDown" || event.code === "KeyZ")) ||
      (event instanceof WheelEvent && event.deltaY < 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === min ? max : this.intersectionIndex - 1;
      this.dispatchEvent(new Event("update"));
    }
  };

  setMesh(name: KnownInstancedMeshNames, mesh: THREE.Object3D) {
    mesh.name = name;
    const current = this.meshMap.get(name);
    if (current !== mesh) {
      if (current) {
        this.group.remove(current);
        // noinspection SuspiciousTypeOfGuard
        if (current instanceof THREE.Mesh) current.geometry.dispose();
      }
      this.group.add(mesh);
      this.meshMap.set(name, mesh);
    }
  }

  intersect(pointer: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster.setFromCamera(pointer, camera);
    const intersections = this.raycaster.intersectObject(this.group);

    if (!shallowEqual(intersections, this.intersections)) {
      this.intersections = intersections;
      this.intersectionIndex = 0;
      this.dispatchEvent(new Event("update"));
    }
  }

  findIntersection(): undefined | THREE.Intersection {
    const { mode, tool } = this.state;

    if (tool !== "select") return;

    const intersections = this.intersections.filter(
      ({ object }) =>
        (mode === "create" && object === this.meshMap.get("additions")) ||
        (mode === "create" &&
          object === this.meshMap.get("additionsVirtual")) ||
        (mode === "update" && object === this.meshMap.get("updates")) ||
        (mode === "update" && object === this.meshMap.get("currentDistrict")) ||
        (mode === "delete" && object === this.meshMap.get("deletions")) ||
        (mode === "delete" && object === this.meshMap.get("currentDistrict")),
    );

    return intersections[this.intersectionIndex];
  }

  render() {
    const intersection = this.findIntersection();

    for (const mesh of this.meshMap.values()) {
      // noinspection SuspiciousTypeOfGuard
      if (!(mesh instanceof THREE.InstancedMesh)) continue;

      const name = mesh.name as KnownInstancedMeshNames;
      const { colors, ids } = mesh.userData;
      const meshColors = getColor(name, this.state.mode);
      const instanceColors = new Array(colors.length).fill(
        meshColors.idle,
      ) as THREE.Color[];

      if (intersection) {
        if (intersection.object === mesh) {
          instanceColors.splice(
            intersection.instanceId!,
            1,
            meshColors.intersection,
          );
        }
      }

      if (this.state.selected) {
        for (const nodeId of this.state.selected) {
          if (ids[nodeId]) {
            for (const index of ids[nodeId]) {
              instanceColors.splice(index, 1, meshColors.selected);
            }
          }
        }
      }

      let needsUpdate = false;
      for (let i = 0; i < colors.length; i++) {
        const instanceColor = instanceColors[i];
        const currentColor = colors[i];
        if (currentColor === instanceColor) continue;
        mesh.setColorAt(i, instanceColor);
        needsUpdate = true;
      }
      if (needsUpdate && mesh.instanceColor) {
        mesh.userData.colors = instanceColors;
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }
}

export default Map3DState;
