import * as THREE from "three";

import type {
  DistrictProperties,
  InstancedMeshTransforms,
} from "../types/types.ts";

const getCount = (length: number) =>
  Math.max(1000, Math.ceil(length / 1000) * 1000);

export function createDistrictMesh(
  currentMesh: THREE.InstancedMesh | null,
  district: DistrictProperties,
  instances: InstancedMeshTransforms[],
  material: THREE.Material,
  onRemove?: (mesh: THREE.Mesh | THREE.Line | null) => void,
  onAdd?: (mesh: THREE.Object3D) => void,
  color?: THREE.Color,
) {
  let mesh = currentMesh;

  if (mesh && mesh.count !== getCount(instances.length)) {
    onRemove?.(mesh);
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
    mesh.userData.district = "";
    mesh.userData.instances = [];
    mesh.userData.ids = {};
    onAdd?.(mesh);
  }

  if (district.name !== mesh.userData.district) {
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
    if (instances[index] === mesh.userData.instances[index]) continue;

    const position = new THREE.Vector3(
      instances[index].position.x,
      instances[index].position.z,
      -instances[index].position.y,
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
    );

    needsUpdate = true;
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    if (color) mesh.setColorAt(index, color);
  }

  for (
    let index = instances.length;
    index < mesh.userData.instances.length;
    index++
  ) {
    const position = new THREE.Vector3(0, 0, 0);
    const rotation = new THREE.Quaternion(0, 0, 0);
    const scale = new THREE.Vector3(0, 0, 0);

    needsUpdate = true;
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    if (color) mesh.setColorAt(index, color);
  }

  const ids = instances.map(({ id, originId }) => originId || id);
  mesh.userData.district = district.name;
  mesh.userData.instances = instances;
  mesh.userData.ids = ids.reduce(
    (acc, id, index) => {
      acc[id] = (acc[id] || []).concat(index);
      return acc;
    },
    {} as Record<string, number[]>,
  );

  if (needsUpdate) mesh.instanceMatrix.needsUpdate = true;
  if (!color) mesh.setColorAt(0, new THREE.Color(0xffffff));

  return mesh;
}
