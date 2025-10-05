import * as THREE from "three";

import type { DistrictData } from "../types.ts";
import { importDDS } from "./importDDS.ts";

export function importBuildings(
  districtData: DistrictData,
  material: THREE.Material,
  excludedIndexes: number[] = [],
) {
  return importDDS(
    districtData.imageData,
    material,
    districtData.cubeSize,
    new THREE.Vector3(...districtData.position),
    new THREE.Vector4(...districtData.transMin),
    new THREE.Vector4(...districtData.transMax),
    excludedIndexes,
  );
}
