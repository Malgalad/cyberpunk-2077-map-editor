import * as THREE from "three";

import type {
  DistrictProperties,
  InstancedMeshTransforms,
} from "../types/types.ts";
import { addInstanceUpdateRange } from "./addInstanceUpdateRange.ts";

const getCount = (length: number) =>
  Math.max(1000, Math.ceil(length / 1000) * 1000);
const nullMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0, 0),
  new THREE.Quaternion(0, 0, 0, 0),
  new THREE.Vector3(0, 0, 0),
);
const nullColor = new THREE.Color(0, 0, 0);
const pendingBoundsRebuilds = new WeakMap<THREE.InstancedMesh, () => void>();

function scheduleBoundsRebuild(mesh: THREE.InstancedMesh) {
  pendingBoundsRebuilds.get(mesh)?.();

  const cancel = () => {
    clearTimeout(timer);
    pendingBoundsRebuilds.delete(mesh);
    mesh.removeEventListener("dispose", cancel);
    mesh.removeEventListener("removed", cancel);
    mesh.geometry.removeEventListener("dispose", cancel);
  };
  const timer = setTimeout(() => {
    cancel();
    mesh.computeBoundingSphere();
  }, 250);

  pendingBoundsRebuilds.set(mesh, cancel);
  mesh.addEventListener("dispose", cancel);
  mesh.addEventListener("removed", cancel);
  mesh.geometry.addEventListener("dispose", cancel);
}

export function createDistrictMesh(
  currentMesh: THREE.InstancedMesh | null,
  district: DistrictProperties,
  instances: InstancedMeshTransforms[],
  material: THREE.Material,
  color?: THREE.Color,
  changedIndexes?: number[],
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
    mesh.userData.colors = {};
    mesh.userData.ids = {};
  }

  if (
    district.name !== mesh.userData.district.name ||
    !district.position.every((v, i) => mesh.position.getComponent(i) === v)
  ) {
    const position = new THREE.Vector3().fromArray(district.position);
    const transformMin = new THREE.Vector4().fromArray(district.transMin);

    mesh.position.set(
      position.x + transformMin.x,
      position.z + transformMin.z,
      -position.y - transformMin.y,
    );
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const bounds = mesh.boundingSphere;
  const instanceSphere = new THREE.Sphere();
  const previousInstances: InstancedMeshTransforms[] = mesh.userData.instances;
  const indexes = previousInstances === instances ? changedIndexes : undefined;
  const previousColor = new THREE.Color();
  let idsChanged = previousInstances.length !== instances.length;
  let matrixNeedsUpdate = false;
  let colorNeedsUpdate = false;

  for (
    let cursor = 0;
    cursor < (indexes?.length ?? instances.length);
    cursor++
  ) {
    const index = indexes?.[cursor] ?? cursor;
    const instance = instances[index];
    const previous = previousInstances[index];

    if (!indexes && instance === previous) continue;

    if (
      instance.id !== previous?.id ||
      instance.originId !== previous?.originId
    )
      idsChanged = true;

    position.set(
      instance.position.x,
      instance.position.z,
      -instance.position.y,
    );
    rotation.set(
      instance.orientation.x,
      instance.orientation.z,
      -instance.orientation.y,
      instance.orientation.w,
    );
    scale.set(instance.scale.x, instance.scale.z, instance.scale.y);

    matrixNeedsUpdate = true;
    matrix.compose(position, rotation, scale);
    mesh.setMatrixAt(index, matrix);
    addInstanceUpdateRange(mesh.instanceMatrix, index);
    if (bounds) {
      // Match the Float32 matrix used by rendering and raycasting.
      mesh.getMatrixAt(index, matrix);
      bounds.union(
        instanceSphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix),
      );
    }

    const nextColor = currentColors[instance.id] || color;
    if (nextColor) {
      if (mesh.instanceColor) {
        mesh.getColorAt(index, previousColor);
        if (
          previousColor.r === Math.fround(nextColor.r) &&
          previousColor.g === Math.fround(nextColor.g) &&
          previousColor.b === Math.fround(nextColor.b)
        )
          continue;
      }
      mesh.setColorAt(index, nextColor);
      addInstanceUpdateRange(mesh.instanceColor!, index);
      colorNeedsUpdate = true;
    }
  }

  for (
    let index = instances.length;
    index < previousInstances.length;
    index++
  ) {
    matrixNeedsUpdate = true;
    mesh.setMatrixAt(index, nullMatrix);
    addInstanceUpdateRange(mesh.instanceMatrix, index);
    if (mesh.instanceColor) {
      mesh.getColorAt(index, previousColor);
      if (!previousColor.equals(nullColor)) {
        mesh.setColorAt(index, nullColor);
        addInstanceUpdateRange(mesh.instanceColor, index);
        colorNeedsUpdate = true;
      }
    }
  }

  mesh.userData.district = district;
  mesh.userData.instances = instances;
  // carry over selected blocks, otherwise data is cleared, and there is a mismatch
  // between actual matrix colors and userData
  mesh.userData.colors = instances.reduce(
    (acc, { id }) => {
      acc[id] = currentColors[id] || color;
      return acc;
    },
    {} as Record<string, THREE.Color>,
  );
  if (idsChanged) {
    const ids: Record<string, number[]> = {};
    for (let index = 0; index < instances.length; index++) {
      const { id, originId } = instances[index];
      (ids[originId || id] ??= []).push(index);
    }
    mesh.userData.ids = ids;
  }

  if (matrixNeedsUpdate) mesh.instanceMatrix.needsUpdate = true;
  if (colorNeedsUpdate && mesh.instanceColor)
    mesh.instanceColor.needsUpdate = true;
  if (matrixNeedsUpdate) {
    if (bounds) {
      // Removed slots collapse to the origin, which may be outside the old bounds.
      if (instances.length < previousInstances.length)
        bounds.expandByPoint(new THREE.Vector3());
      scheduleBoundsRebuild(mesh);
    } else {
      mesh.computeBoundingSphere();
    }
  }

  return mesh;
}
