import { nanoid } from "nanoid";
import * as THREE from "three";

import type {
  InstancedMeshTransforms,
  MapNodeV2,
  NodesIndex,
  NodesMap,
} from "../types/types.ts";
import { applyTransforms } from "./transforms.ts";
import { toTuple3 } from "./utilities.ts";

const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));

export function nodeToTransform(node: MapNodeV2): InstancedMeshTransforms {
  const position = {
    x: node.position[0],
    y: node.position[1],
    z: node.position[2],
    w: 1,
  };
  const quaternion = toQuaternion(node.rotation);
  const orientation = {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
  const scale = {
    x: node.scale[0],
    y: node.scale[1],
    z: node.scale[2],
    w: node.scale.every((n) => n === 1) ? 0 : 1,
  };

  return {
    id: node.id,
    index: node.indexInDistrict,
    virtual: node.virtual ?? false,
    originId: node.originId ?? null,
    position,
    orientation,
    scale,
  };
}

export function cloneNode(
  nodes: NodesMap,
  index: NodesIndex,
  node: MapNodeV2,
  parent: string | null = node.parent,
): MapNodeV2[] {
  const clone = {
    ...structuredClone(node),
    id: nanoid(),
    parent,
  };
  const clones: MapNodeV2[] = [clone];

  if (clone.type === "group") {
    const branch = index[clone.id].treeNode;
    if (branch.type === "district") throw new Error("Trying to clone district");
    const leaves = branch.children;

    for (const childLeaf of leaves) {
      const child = nodes[childLeaf.id];
      clones.push(...cloneNode(nodes, index, child, clone.id));
    }
  }

  return clones;
}

// export function transformCoordinates(
//   transform: TransformParsed,
//   fromSystem: TransformParsed,
//   toSystem: TransformParsed,
// ): TransformParsed {
//   const object = new THREE.Object3D();
//   const quaternion = toQuaternion(transform.rotation);
//   const fromQuaternion = toQuaternion(fromSystem.rotation);
//   const targetQuaternion = toQuaternion(toSystem.rotation).invert();
//
//   object.position.fromArray(transform.position);
//   object.position.sub(toVector3(fromSystem.position));
//   object.position.applyQuaternion(fromQuaternion);
//   object.position.applyQuaternion(targetQuaternion);
//   object.position.add(toVector3(toSystem.position));
//
//   object.quaternion
//     .copy(quaternion)
//     .multiply(fromQuaternion)
//     .multiply(targetQuaternion);
//   object.scale.fromArray(transform.scale);
//
//   return {
//     position: object.position.toArray() as THREE.Vector3Tuple,
//     rotation: fromEuler(object.rotation),
//     scale: object.scale.toArray() as THREE.Vector3Tuple,
//   };
// }

export function getNodeDistrict<T extends { id: string; parent: string }>(
  nodes: T[],
  node: T,
) {
  const map = new Map(nodes.map((node) => [node.id, node]));
  let current = node;

  while (current.parent) {
    current = map.get(current.parent)!;
  }

  return current.parent;
}

// const zeroTransforms: TransformParsed = {
//   position: [0, 0, 0],
//   rotation: [0, 0, 0],
//   scale: [1, 1, 1],
// };
export function transplantNode(
  nodes: NodesMap,
  node: MapNodeV2,
  parentId: string | null,
  district: string,
): MapNodeV2 {
  const nodeApplied = applyTransforms(nodes, node);

  if (!parentId) {
    return {
      ...nodeApplied,
      parent: null,
      district,
    };
  }

  const parent = nodes[parentId];
  const negateRotation = parent.rotation.map(
    (n) => n * -1,
  ) as THREE.Vector3Tuple;
  const parentRotation = toQuaternion(negateRotation);
  const parentTransforms = applyTransforms(nodes, parent);
  const position = [
    nodeApplied.position[0] - parentTransforms.position[0],
    nodeApplied.position[1] - parentTransforms.position[1],
    nodeApplied.position[2] - parentTransforms.position[2],
  ] as THREE.Vector3Tuple;
  const object = new THREE.Object3D();
  object.rotation.setFromQuaternion(
    toQuaternion(node.rotation).multiply(parentRotation),
  );
  object.position.fromArray(position);
  object.position.applyQuaternion(parentRotation);

  return {
    ...nodeApplied,
    parent: parentId,
    district,
    position: object.position.toArray(),
    rotation: toTuple3(object.rotation.toArray() as number[]),
  };
}

export function getParent(node?: MapNodeV2) {
  return node ? (node.type === "group" ? node.id : node.parent) : null;
}
