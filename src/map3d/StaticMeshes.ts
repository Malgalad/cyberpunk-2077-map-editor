import * as THREE from "three";

import { KNOWN_MESHES } from "../constants.ts";
import { OptionsSelectors } from "../store/options.ts";
import type { AppStore } from "../types/types.ts";
import selectedStateFactory from "../utilities/SelectedState.ts";
import * as materials from "./materials.ts";
import { importMesh } from "./utils.ts";

type EventMap = THREE.Object3DEventMap & {
  /**
   * Fires when child mesh visibility changes
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  visibilityChanged: {};
};

const materialsMap: Record<string, THREE.Material | THREE.Material[]> = {
  terrain_mesh: materials.terrainMaterial,
  "3dmap_cliffs": materials.terrainMaterial,
  "3dmap_roads": [materials.roadsMaterial, materials.roadsMaterial2],
  "3dmap_roads_borders": materials.roadsBordersMaterial,
  "3dmap_metro": materials.experimentalMetroMaterial,
  water_mesh: materials.waterMaterial,
  northoak_sign_a: materials.statuesMaterial,
  monument_ave_pyramid: materials.statuesMaterial,
  obelisk: materials.statuesMaterial,
  cz_cz_building_h_icosphere: materials.statuesMaterial,
  statue_splash_a: materials.statuesMaterial,
  ferris_wheel_pacifica: materials.statuesMaterial,
  ferris_wheel_collapsed: materials.statuesMaterial,
  ext_monument_av_building_b: materials.statuesMaterial,
};

const selectors = {
  meshes: OptionsSelectors.getVisibleMeshes,
};

class StaticMeshes extends THREE.Group<EventMap> {
  private readonly state: ReturnType<
    typeof selectedStateFactory<typeof selectors>
  >;
  name = "StaticMeshes";

  constructor(store: AppStore) {
    super();

    this.state = selectedStateFactory(store, selectors);
    this.state.subscribe(this.update);

    for (const name of KNOWN_MESHES) {
      const materials = [materialsMap[name]].flat();

      for (const material of materials) {
        importMesh(name, material).then((mesh) => {
          mesh.visible = this.state.meshes.includes(mesh.name);
          this.add(mesh);
        });
      }
    }
  }

  dispose() {
    this.state.dispose();
    this.children.forEach((child) => {
      (child as THREE.Mesh).geometry.dispose();
    });
  }

  private update = () => {
    this.children.forEach((child) => {
      child.visible = this.state.meshes.includes(child.name);
    });
    this.dispatchEvent({ type: "visibilityChanged" });
  };
}

export default StaticMeshes;
