import * as THREE from "three";

import { NodesSelectors } from "../store/nodes.ts";
import { OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import type {
  AppStore,
  DistrictProperties,
  InstancedMeshTransforms,
  PatternView,
} from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import { getPalette } from "./colors.ts";
import { EXCLUDE_AO_LAYER } from "./constants.ts";
import { createDistrictMesh } from "./createDistrictMesh.ts";
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
  private readonly meshMap = new Map<
    KnownInstancedMeshNames,
    THREE.InstancedMesh
  >();
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;

  constructor(store: AppStore) {
    super();

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.onUpdate);

    this.name = "CurrentDistrict";
  }

  dispose() {
    this.state.dispose();
    for (const mesh of this.children) {
      // noinspection SuspiciousTypeOfGuard
      if (mesh instanceof THREE.InstancedMesh) {
        mesh.geometry.dispose();
      }
    }
  }

  clear() {
    super.clear();
    this.meshMap.clear();
    return this;
  }

  onUpdate = () => {
    this.setViable();
    this.updateAdditionsVirtualMaterial();
    this.updateInstancedMeshColors();
    this.dispatchEvent({ type: "updated" });
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
    const intersection = this.userData.intersection as
      | undefined
      | THREE.Intersection;

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

  setMesh(
    name: KnownInstancedMeshNames,
    district: DistrictProperties,
    transforms: InstancedMeshTransforms[],
    material: THREE.Material,
    color: THREE.Color,
  ) {
    const current = this.meshMap.get(name);
    const mesh = createDistrictMesh(
      current ?? null,
      district,
      transforms,
      material,
      color,
    );
    mesh.name = name;
    if (current !== mesh) {
      if (current) {
        this.remove(current);
        current.geometry.dispose();
      }
      this.add(mesh);
      this.meshMap.set(name, mesh);
      if (name === "deletions") mesh.layers.set(EXCLUDE_AO_LAYER);
      if (name === "additionsVirtual") this.updateAdditionsVirtualMaterial();
    }
    this.setViable();
    this.updateInstancedMeshColors();
  }

  private setViable() {
    const { mode, tool } = this.state;

    for (const [name, mesh] of this.meshMap) {
      mesh.userData.viable =
        tool === "select" &&
        ((mode === "create" && name === "additions") ||
          (mode === "create" && name === "additionsVirtual") ||
          (mode === "update" && name === "updates") ||
          (mode === "update" && name === "currentDistrict") ||
          (mode === "delete" && name === "deletions") ||
          (mode === "delete" && name === "currentDistrict"));
    }
  }
}

export default CurrentDistrict;
