import * as THREE from "three";

import type { Districts } from "../types.ts";
import { STATIC_ASSETS } from "./constants.ts";
import { importDDS } from "./importDDS.ts";
// import { buildingsMaterial } from "./materials.ts";

export function importBuildings(
  region: Districts[keyof Districts],
  material: THREE.Material,
) {
  return importDDS(
    `${STATIC_ASSETS}/textures/${region.texture.replace(".xbm", ".dds")}`,
    material,
    region.cubeSize,
    new THREE.Vector3(...region.position),
    new THREE.Vector4(...region.transMin),
    new THREE.Vector4(...region.transMax),
  );
}
