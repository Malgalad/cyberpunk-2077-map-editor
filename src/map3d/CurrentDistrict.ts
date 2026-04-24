import { shallowEqual } from "react-redux";
import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  InstancedMeshTransforms,
  PatternView,
} from "../types/types.ts";
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
      const {
        colors: meshColors,
        ids: meshIds,
        instances,
      } = mesh.userData as {
        colors: Record<string, THREE.Color>;
        ids: Record<string, number[]>;
        instances: InstancedMeshTransforms[];
      };
      const palette = getPalette(name, this.state.mode);
      const nextColors = instances.reduce(
        (acc, { id }) => {
          acc[id] = palette.idle;
          return acc;
        },
        {} as Record<string, THREE.Color>,
      );

      if (intersection) {
        if (intersection.object === mesh) {
          const instance = instances[intersection.instanceId!];
          nextColors[instance.id] = palette.intersection;
        }
      }

      if (this.state.selected) {
        for (const nodeId of this.state.selected) {
          if (meshIds[nodeId]) {
            for (const index of meshIds[nodeId]) {
              const instance = instances[index];
              nextColors[instance.id] = palette.selected;
            }
          }
        }
      }

      let needsUpdate = false;
      for (let i = 0; i < instances.length; i++) {
        const { id } = instances[i];
        if (meshColors[id] === nextColors[id]) continue;
        mesh.setColorAt(i, nextColors[id]);
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
    }
    this.intersect();
  }

  castRay(pointer: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster.setFromCamera(pointer, camera);
    this.intersect();
  }

  private intersect() {
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
