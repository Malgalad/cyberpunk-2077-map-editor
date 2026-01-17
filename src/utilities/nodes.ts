import { nanoid } from "nanoid";
import * as THREE from "three";

import { MAX_DEPTH, TEMPLATE_ID } from "../constants.ts";
import type {
  InstancedMeshTransforms,
  MapNodeV2,
  NodesIndex,
  NodesIndexIntermediate,
  NodesMap,
  NodesTree,
  Optional,
  TreeNode,
  TreeRoot,
} from "../types/types.ts";
import { applyTransforms } from "./transforms.ts";
import { toTuple3, unwrapDraft } from "./utilities.ts";

const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));

export function initNode(
  init: Optional<MapNodeV2, "type" | "tag" | "district" | "position">,
) {
  const {
    type,
    tag,
    district,
    position,
    hidden = false,
    indexInDistrict = -1,
    id = nanoid(),
    label = init.type === "instance" ? "Block" : "Group",
    mirror = null,
    parent = null,
    rotation = [0, 0, 0],
    scale = type === "instance" ? [100, 100, 100] : [1, 1, 1],
  } = init;
  const node: MapNodeV2 = {
    id,
    label,
    type,
    tag,
    parent,
    district,
    indexInDistrict,
    hidden,
    position,
    rotation,
    scale,
    mirror,
  };

  return node;
}

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
    ...structuredClone(unwrapDraft(node)),
    id: nanoid(),
    parent,
  };
  const clones: MapNodeV2[] = [clone];

  if (node.type === "group") {
    const branch = index[node.id].treeNode;
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

const getWeight = (node: MapNodeV2) => 1 + (node.pattern?.count ?? 0);

export function buildSupportStructures(nodes: Record<string, MapNodeV2>) {
  const tree: NodesTree = {};
  const indexTemp: NodesIndexIntermediate = {};
  const processed = new Set<string>();

  const processNode = (node: MapNodeV2, depth: number) => {
    const { parent, district } = node;

    if (processed.has(node.id)) return;

    if (parent) {
      if (!indexTemp[parent]) processNode(nodes[parent], depth);
    } else {
      if (!indexTemp[district]) {
        const rootNode: TreeRoot =
          district === TEMPLATE_ID
            ? {
                id: TEMPLATE_ID,
                type: "template",
                children: [],
              }
            : {
                id: district,
                type: "district",
                create: [],
                update: [],
                delete: [],
              };
        tree[district] = rootNode;
        indexTemp[district] = {
          treeNode: rootNode,
          descendantIds: [],
          ancestorIds: [],
        };
      }
    }

    const parentIndex = indexTemp[parent || district];
    const parentTree = parentIndex.treeNode;
    const treeNode: TreeNode = {
      id: node.id,
      type: node.type,
      children: [],
      weight: 0,
      depth: parentTree.type === "group" ? parentTree.depth + 1 : depth,
    };

    if (parentTree.type === "district") {
      parentTree[node.tag].push(treeNode);
    } else {
      parentTree.children.push(treeNode);
    }

    if (node.type === "instance") {
      parentIndex.descendantIds.push(node.id);
      treeNode.weight = getWeight(node);
    } else {
      const nodeIndex: NodesIndexIntermediate[string] = {
        treeNode,
        descendantIds: [],
        ancestorIds: [parentIndex.ancestorIds],
      };
      if (parent) nodeIndex.ancestorIds.unshift(parent);
      parentIndex.descendantIds.push(node.id, nodeIndex.descendantIds);
      indexTemp[node.id] = nodeIndex;
    }

    processed.add(node.id);
  };
  const weightNode = (node: TreeNode) => {
    if (node.weight > 0) return;
    if (node.type === "instance") {
      node.weight = getWeight(nodes[node.id]);
    } else {
      for (const child of node.children) {
        weightNode(child);
      }
      node.weight =
        node.children.reduce((acc, child) => acc + child.weight, 0) *
        getWeight(nodes[node.id]);
    }
  };

  for (const node of Object.values(nodes)) {
    processNode(node, 0);
  }

  const index: NodesIndex = {};

  for (const id of Object.keys(indexTemp)) {
    index[id] = {
      treeNode: indexTemp[id].treeNode,
      descendantIds: indexTemp[id].descendantIds.flat(MAX_DEPTH) as string[],
      ancestorIds: indexTemp[id].ancestorIds.flat(MAX_DEPTH) as string[],
    };

    if (index[id].treeNode.type === "group") weightNode(index[id].treeNode);
  }

  console.log(tree);

  return { tree, index };
}
