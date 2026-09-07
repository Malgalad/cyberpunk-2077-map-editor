import * as THREE from "three";

import { frustumSize } from "../map3d/map3d.base.ts";
import type { District, InstancedMeshTransforms } from "../types/types.ts";

export function getTransformsBoundingBox(
  transforms: InstancedMeshTransforms[],
  district: District,
): THREE.Box3 {
  const bounds = new THREE.Box3();
  const unitBox = new THREE.Box3(
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
  );
  const instanceBox = new THREE.Box3();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (const transform of transforms) {
    if (
      transform.scale.x === 0 &&
      transform.scale.y === 0 &&
      transform.scale.z === 0
    )
      continue;

    position.set(
      transform.position.x + district.origin.x,
      transform.position.z + district.origin.z,
      -(transform.position.y + district.origin.y),
    );
    rotation.set(
      transform.orientation.x,
      transform.orientation.z,
      -transform.orientation.y,
      transform.orientation.w,
    );
    scale.set(transform.scale.x, transform.scale.z, transform.scale.y);
    matrix.compose(position, rotation, scale);
    bounds.union(instanceBox.copy(unitBox).applyMatrix4(matrix));
  }

  return bounds;
}

export function lookAtTransform(
  transform: InstancedMeshTransforms,
  district: District,
): [THREE.Vector3, number] {
  const { origin } = district;
  const position = new THREE.Vector3().fromArray([
    transform.position.x + origin.x,
    transform.position.z + origin.z,
    -(transform.position.y + origin.y),
  ]);
  const approximateScale = (transform.scale.x + transform.scale.y) / 2;
  const zoom = Math.min(100, Math.floor(frustumSize / 2 / approximateScale));

  return [position, zoom];
}
