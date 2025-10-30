import * as THREE from "three";

import { frustumSize } from "../map3d/map3d.base.ts";
import type { District, InstancedMeshTransforms } from "../types/types.ts";

export function lookAtTransform(
  transform: InstancedMeshTransforms,
  district: District,
): [THREE.Vector3, number] {
  const { minMax, origin } = district;
  const position = new THREE.Vector3().fromArray([
    transform.position.x * minMax.x + origin.x,
    transform.position.z * minMax.z + origin.z,
    -(transform.position.y * minMax.y + origin.y),
  ]);
  const approximateScale =
    ((transform.scale.x + transform.scale.y) / 2) * 2 * 200;
  const zoom = Math.min(100, Math.floor(frustumSize / 2 / approximateScale));

  return [position, zoom];
}
