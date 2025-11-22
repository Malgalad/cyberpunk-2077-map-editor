import * as THREE from "three";

import type {
  DistrictProperties,
  InstancedMeshTransforms,
} from "../types/types.ts";

// TODO optimize - no need to recreate whole instanced mesh when editing single instance
export function createDistrictMesh(
  district: DistrictProperties,
  instances: InstancedMeshTransforms[],
  material: THREE.Material,
  color?: THREE.Color,
): THREE.InstancedMesh {
  const position = new THREE.Vector3().fromArray(district.position);
  const transformMin = new THREE.Vector4().fromArray(district.transMin);
  const transformMax = new THREE.Vector4().fromArray(district.transMax);
  const cubeSize = district.cubeSize;

  const matrix = new THREE.Matrix4();
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const positionRange = transformMax.sub(transformMin);

  mesh.userData.indexes = instances.map((item) => item.id);
  mesh.userData.count = instances.length;
  mesh.position.set(
    position.x + transformMin.x,
    position.z + transformMin.z,
    -position.y - transformMin.y,
  );

  for (let index = 0; index < instances.length; index++) {
    const position = new THREE.Vector3(
      instances[index].position.x * positionRange.x,
      instances[index].position.z * positionRange.z,
      -instances[index].position.y * positionRange.y,
    );
    const rotation = new THREE.Quaternion(
      instances[index].orientation.x,
      instances[index].orientation.z,
      -instances[index].orientation.y,
      instances[index].orientation.w,
    );
    const scale = new THREE.Vector3(
      instances[index].scale.x,
      instances[index].scale.z,
      instances[index].scale.y,
    ).multiplyScalar(2);

    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    if (color) mesh.setColorAt(index, color);
  }

  if (!color) mesh.setColorAt(0, new THREE.Color(0xffffff));

  return mesh;
}
