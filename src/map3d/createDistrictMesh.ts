import * as THREE from "three";

import type {
  DistrictProperties,
  InstancedMeshTransforms,
} from "../types/types.ts";

const getCount = (length: number) =>
  Math.max(1000, Math.ceil(length / 1000) * 1000);
const nullMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0, 0),
  new THREE.Quaternion(0, 0, 0, 0),
  new THREE.Vector3(0, 0, 0),
);
const nullColor = new THREE.Color(0, 0, 0);

export function createDistrictMesh(
  currentMesh: THREE.InstancedMesh | null,
  district: DistrictProperties,
  instances: InstancedMeshTransforms[],
  material: THREE.Material,
  color?: THREE.Color,
) {
  const currentColors = currentMesh?.userData.colors ?? [];
  let mesh = currentMesh;

  if (mesh && mesh.count !== getCount(instances.length)) {
    mesh.dispose();
    mesh = null;
  }

  if (!mesh) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    mesh = new THREE.InstancedMesh(
      geometry,
      material,
      getCount(instances.length),
    );
    mesh.userData.district = {};
    mesh.userData.instances = [];
    mesh.userData.colors = [];
    mesh.userData.ids = {};
  }

  if (district.name !== mesh.userData.district.name) {
    const position = new THREE.Vector3().fromArray(district.position);
    const transformMin = new THREE.Vector4().fromArray(district.transMin);

    mesh.position.set(
      position.x + transformMin.x,
      position.z + transformMin.z,
      -position.y - transformMin.y,
    );
  }

  const matrix = new THREE.Matrix4();
  let needsUpdate = false;

  for (let index = 0; index < instances.length; index++) {
    const instance = instances[index];

    if (instance === mesh.userData.instances[index]) continue;

    const position = new THREE.Vector3(
      instance.position.x,
      instance.position.z,
      -instance.position.y,
    );
    const rotation = new THREE.Quaternion(
      instance.orientation.x,
      instance.orientation.z,
      -instance.orientation.y,
      instance.orientation.w,
    );
    const scale = new THREE.Vector3(
      instance.scale.x,
      instance.scale.z,
      instance.scale.y,
    );

    needsUpdate = true;
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    if (currentColors[index] || color)
      mesh.setColorAt(index, currentColors[index] || color);
  }

  for (
    let index = instances.length;
    index < mesh.userData.instances.length;
    index++
  ) {
    needsUpdate = true;
    mesh.setMatrixAt(index, nullMatrix);
    mesh.setColorAt(index, nullColor);
  }

  const originIds = instances.map(({ id, originId }) => originId || id);
  mesh.userData.district = district;
  mesh.userData.instances = instances;
  // carry over selected blocks, otherwise data is cleared, and there is a mismatch
  // between actual matrix colors and userData
  mesh.userData.colors = Array.from(
    { length: instances.length },
    (_, i) => currentColors[i] || color,
  );
  mesh.userData.ids = originIds.reduce(
    (acc, id, index) => {
      acc[id] = (acc[id] || []).concat(index);
      return acc;
    },
    {} as Record<string, number[]>,
  );

  if (needsUpdate) mesh.instanceMatrix.needsUpdate = true;
  if (needsUpdate) mesh.computeBoundingSphere();

  return mesh;
}
