import { shallowEqual } from "react-redux";
import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type { AppStore, PatternView } from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { getPalette } from "./colors.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import * as materials from "./materials.ts";
import type { KnownInstancedMeshNames } from "./types.ts";

type EventMap = THREE.Object3DEventMap & {
  /**
   * Fires when any instanced mesh color is updated
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  updated: {};
};

const virtualEditsMaterial: Record<PatternView, THREE.Material> = {
  none: materials.hiddenMaterial,
  wireframe: materials.wireframeMaterial,
  solid: materials.patternMaterial,
};

const selectors = {
  mode: ProjectSelectors.getMode,
  pattern: OptionsSelectors.getPatternView,
  selected: NodesSelectors.getSelectedNodesDeep,
  tool: ProjectSelectors.getTool,
} as const;

class CurrentDistrict extends THREE.Group<EventMap> {
  private readonly raycaster = new THREE.Raycaster();
  private readonly meshMap = new Map<KnownInstancedMeshNames, THREE.Object3D>();
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  private intersections: THREE.Intersection[] = [];
  private intersectionIndex = 0;

  constructor(store: AppStore) {
    super();

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.onUpdate);

    this.name = "CurrentDistrict";
    this.raycaster.layers.enable(EXCLUDE_AO_LAYER);
    document.addEventListener("keyup", this.changeIntersectionIndex);
    document.addEventListener("wheel", this.changeIntersectionIndex);
  }

  dispose() {
    this.state.dispose();
    for (const mesh of this.children) {
      // noinspection SuspiciousTypeOfGuard
      if (mesh instanceof THREE.InstancedMesh) {
        mesh.geometry.dispose();
      }
    }
    document.removeEventListener("keyup", this.changeIntersectionIndex);
    document.removeEventListener("wheel", this.changeIntersectionIndex);
  }

  clear() {
    super.clear();
    this.intersections = [];
    this.intersectionIndex = 0;
    this.meshMap.clear();
    return this;
  }

  private onUpdate = () => {
    this.updateAdditionsVirtualMaterial();
    this.updateInstancedMeshColors();
    this.dispatchEvent({ type: "updated" });
  };

  private changeIntersectionIndex = (event: KeyboardEvent | WheelEvent) => {
    const min = 0;
    const max = this.intersections.length - 1;
    const isKeyboardEvent = event instanceof KeyboardEvent;
    const isWheelEvent = event instanceof WheelEvent;

    if (min === max) return;

    if (
      (isKeyboardEvent &&
        (event.code === "ArrowUp" || event.code === "KeyC")) ||
      (isWheelEvent && event.deltaY > 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === max ? min : this.intersectionIndex + 1;
      this.onUpdate();
    }

    if (
      (isKeyboardEvent &&
        (event.code === "ArrowDown" || event.code === "KeyZ")) ||
      (isWheelEvent && event.deltaY < 0)
    ) {
      this.intersectionIndex =
        this.intersectionIndex === min ? max : this.intersectionIndex - 1;
      this.onUpdate();
    }
  };

  private updateAdditionsVirtualMaterial() {
    if (!this.meshMap.get("additionsVirtual")) return;

    const mesh = this.meshMap.get("additionsVirtual") as THREE.InstancedMesh;

    const next = virtualEditsMaterial[this.state.pattern];
    if (mesh.material !== next) {
      mesh.material = next;
    }

    mesh.layers.set(this.state.pattern === "solid" ? 0 : EXCLUDE_AO_LAYER);
  }

  private updateInstancedMeshColors() {
    const intersection = this.findIntersection();

    for (const mesh of this.children) {
      // noinspection SuspiciousTypeOfGuard
      if (!(mesh instanceof THREE.InstancedMesh)) continue;

      const name = mesh.name as KnownInstancedMeshNames;
      const { colors, ids } = mesh.userData as {
        colors: THREE.Color[];
        ids: Record<string, number[]>;
      };
      const palette = getPalette(name, this.state.mode);
      const nextColors = new Array(colors.length).fill(
        palette.idle,
      ) as THREE.Color[];

      if (intersection) {
        if (intersection.object === mesh) {
          nextColors.splice(intersection.instanceId!, 1, palette.intersection);
        }
      }

      if (this.state.selected) {
        for (const nodeId of this.state.selected) {
          if (ids[nodeId]) {
            for (const index of ids[nodeId]) {
              nextColors.splice(index, 1, palette.selected);
            }
          }
        }
      }

      let needsUpdate = false;
      for (let i = 0; i < colors.length; i++) {
        const instanceColor = nextColors[i];
        const currentColor = colors[i];
        if (currentColor === instanceColor) continue;
        mesh.setColorAt(i, instanceColor);
        needsUpdate = true;
      }
      if (needsUpdate && mesh.instanceColor) {
        mesh.userData.colors = nextColors;
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  setMesh(name: KnownInstancedMeshNames, mesh: THREE.Object3D) {
    mesh.name = name;
    const current = this.meshMap.get(name);
    if (current !== mesh) {
      if (current) {
        this.remove(current);
        // noinspection SuspiciousTypeOfGuard
        if (current instanceof THREE.Mesh) current.geometry.dispose();
      }
      this.add(mesh);
      this.meshMap.set(name, mesh);
      if (name === "additionsVirtual") this.updateAdditionsVirtualMaterial();
    }
  }

  intersect(pointer: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster.setFromCamera(pointer, camera);
    const intersections = this.raycaster.intersectObject(this);

    if (!shallowEqual(intersections, this.intersections)) {
      this.intersections = intersections;
      this.intersectionIndex = 0;
      this.onUpdate();
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
}

export default CurrentDistrict;
