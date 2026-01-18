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
  Tuple3,
} from "../types/types.ts";
import { applyTransforms } from "./transforms.ts";
import { invariant, toTuple3, unwrapDraft } from "./utilities.ts";

const toVector3 = (tuple: Tuple3<number>) =>
  new THREE.Vector3().fromArray(tuple);
const fromVector3 = (vector: THREE.Vector3) => toTuple3(vector.toArray());
const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));
const fromQuaternion = (quaternion: THREE.Quaternion) =>
  toTuple3(
    new THREE.Euler().setFromQuaternion(quaternion).toArray() as number[],
  );

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
    const treeNode = index[node.id].treeNode;
    invariant(treeNode.type !== "district", "Unexpected treeNode type");

    for (const childTreeNode of treeNode.children) {
      const child = nodes[childTreeNode.id];
      clones.push(...cloneNode(nodes, index, child, clone.id));
    }
  }

  return clones;
}

export function getFutureParent(selected?: MapNodeV2) {
  return selected
    ? selected.type === "group"
      ? selected.id
      : selected.parent
    : null;
}

const createTemplateRoot = (): TreeRoot => ({
  id: TEMPLATE_ID,
  type: "template",
  children: [],
});
const createDistrictRoot = (district: string): TreeRoot => ({
  id: district,
  type: "district",
  create: [],
  update: [],
  delete: [],
});
const getWeight = (node: MapNodeV2) => 1 + (node.pattern?.count ?? 0);

export function buildSupportStructures(nodes: NodesMap) {
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
            ? createTemplateRoot()
            : createDistrictRoot(district);
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
  const weighNode = (node: TreeNode) => {
    if (node.weight > 0) return;
    if (node.type === "instance") {
      node.weight = getWeight(nodes[node.id]);
    } else {
      for (const child of node.children) {
        weighNode(child);
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

    if (index[id].treeNode.type === "group") weighNode(index[id].treeNode);
  }

  return { tree, index };
}

export function transplantPoint(
  nodes: NodesMap,
  point: Tuple3<number>,
  parentId: string | null,
): Tuple3<number> {
  if (!parentId) return point;

  const resolvedParent = applyTransforms(nodes, nodes[parentId]);
  const invertedParentRotation = toQuaternion(resolvedParent.rotation).invert();

  const position = new THREE.Vector3()
    .sub(toVector3(resolvedParent.position))
    .add(toVector3(point))
    .applyQuaternion(invertedParentRotation);

  return toTuple3(position.toArray());
}

export function transplantNode(
  nodes: NodesMap,
  node: MapNodeV2,
  parentId: string | null,
  district: string,
): MapNodeV2 {
  const resolvedNode = applyTransforms(nodes, node);

  if (!parentId)
    return {
      ...resolvedNode,
      parent: null,
      district,
    };

  const resolvedParent = applyTransforms(nodes, nodes[parentId]);
  const invertedParentRotation = toQuaternion(resolvedParent.rotation).invert();

  const position = new THREE.Vector3()
    .sub(toVector3(resolvedParent.position))
    .add(toVector3(resolvedNode.position))
    .applyQuaternion(invertedParentRotation);

  const rotation = toQuaternion(resolvedNode.rotation).premultiply(
    invertedParentRotation,
  );

  return {
    ...node,
    parent: parentId,
    district,
    position: fromVector3(position),
    rotation: fromQuaternion(rotation),
  };
}
