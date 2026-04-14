import * as THREE from "three";

import { KNOWN_MESHES } from "../constants.ts";
import { OptionsSelectors } from "../store/options.ts";
import type { AppStore } from "../types/types.ts";
import Stateful from "./@Stateful.ts";
import * as materials from "./materials.ts";
import { importMesh } from "./utils.ts";

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

class StaticMeshes extends Stateful<typeof selectors> {
  readonly group = new THREE.Group();

  constructor(store: AppStore) {
    super(store, selectors);

    this.group.name = "StaticMeshes";
    this.setupTerrain();
  }

  dispose() {
    super.dispose();
    this.group.children.forEach((child) => {
      (child as THREE.Mesh).geometry.dispose();
    });
    this.group.clear();
  }

  clear() {}

  private setupTerrain() {
    for (const name of KNOWN_MESHES) {
      const material = materialsMap[name];

      if (Array.isArray(material)) {
        for (const mat of material) {
          importMesh(name, mat).then((mesh) => {
            this.group.add(mesh);
          });
        }
      } else {
        importMesh(name, material).then((mesh) => {
          this.group.add(mesh);
        });
      }
    }
  }

  render() {
    this.group.children.forEach((child) => {
      child.visible = this.state.meshes.includes(child.name);
    });
  }
}

export default StaticMeshes;
