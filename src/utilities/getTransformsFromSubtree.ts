import * as THREE from "three";

import type {
  District,
  InstancedMeshTransforms,
  MapNode,
  NodesIndex,
  NodesMap,
  Plane,
  TreeNode,
} from "../types/types.ts";
import { fromVector3, toQuaternion, toVector3 } from "./math.ts";
import { nodeToTransform } from "./nodes.ts";
import { pipe, toTuple3 } from "./utilities.ts";

const hadamardProduct = (a: THREE.Vector3Tuple, b: number[]) =>
  a.map((x, i) => x * (b[i] ?? 0));
const addTuples = (a: THREE.Vector3Tuple, b: number[]) =>
  toTuple3(a.map((_, i) => a[i] + (b[i] ?? 0)));
const scalePattern = (i: number) => (value: number) => value * (i + 1);
const noTransforms: InstancedMeshTransforms[] = [];

const mirrorPosition = (plane: Plane | null, position: THREE.Vector3Tuple) => {
  if (plane == null) return position;
  const mirror = {
    XY: [1, 1, -1],
    XZ: [1, -1, 1],
    YZ: [-1, 1, 1],
  }[plane];
  return toTuple3(hadamardProduct(position, mirror));
};
const mirrorRotation = (plane: Plane | null, rotation: THREE.Vector3Tuple) => {
  if (plane == null) return rotation;
  const mirror = {
    XY: [-1, -1, 1],
    XZ: [-1, 1, -1],
    YZ: [1, -1, -1],
  }[plane];
  return toTuple3(hadamardProduct(rotation, mirror));
};

const mirrorContext: Array<Plane | null> = [];
function applyParentTransform(parent: MapNode | null) {
  return (node: MapNode): MapNode => {
    if (!parent) return node;

    const parentPosition = toVector3(parent.position);
    const parentRotation = toQuaternion(parent.rotation);

    const object = new THREE.Object3D();

    object.position.fromArray(
      hadamardProduct(
        mirrorContext.reduce(
          (vec3, plane) => mirrorPosition(plane, vec3),
          node.position,
        ),
        parent.scale,
      ),
    );
    object.rotation.fromArray(
      mirrorContext.reduce(
        (vec3, plane) => mirrorRotation(plane, vec3),
        node.rotation,
      ),
    );
    object.scale.fromArray(hadamardProduct(node.scale, parent.scale));

    object.applyQuaternion(parentRotation);
    object.position.applyQuaternion(parentRotation);
    object.position.add(parentPosition);

    return {
      ...node,
      position: fromVector3(object.position),
      rotation: toTuple3(object.rotation.toArray() as number[]),
      scale: fromVector3(object.scale),
    };
  };
}

export function applyTransforms(nodes: NodesMap, node: MapNode) {
  let current = node;
  let parentId = current.parent;

  while (parentId) {
    const parent = nodes[parentId];

    current = applyParentTransform(parent)(current);
    parentId = parent.parent;
  }

  return current;
}

function applyHidden(node: MapNode): MapNode {
  if (node.hidden) return { ...node, scale: [0, 0, 0] };
  return node;
}

function applyCloned(parents: MapNode[]) {
  return (node: MapNode): MapNode => {
    const isCloned = parents.some((parent) => parent.virtual);
    if (!isCloned || node.virtual) return node;
    return { ...node, virtual: true, originId: node.id };
  };
}

function applyOffset(node: MapNode): MapNode {
  // set node Z transform origin to bottom instead of center
  if (node.tag === "create")
    return {
      ...node,
      position: [
        node.position[0],
        node.position[1],
        node.position[2] + node.scale[2] / 2,
      ],
    };
  return node;
}

function applyPattern(node: MapNode): MapNode[] {
  if (!node.pattern) return [];

  if (node.pattern.mirror) {
    return [
      {
        ...node,
        id: node.id + "--X",
        virtual: true,
        originId: node.id,
        mirror: node.pattern.mirror,
      },
    ];
  }

  const clones: MapNode[] = Array(node.pattern.count)
    .fill(node)
    .map((clone, index) => ({
      ...clone,
      id: clone.id + `--${index}`,
      virtual: true,
      originId: node.id,
    }));

  for (let i = 0; i < clones.length; i++) {
    const clone = clones[i];

    clone.position = addTuples(
      clone.position,
      node.pattern.position.map(scalePattern(i)),
    );
    clone.rotation = addTuples(
      clone.rotation,
      node.pattern.rotation.map(scalePattern(i)),
    );
    clone.scale = addTuples(
      clone.scale,
      node.pattern.scale.map(scalePattern(i)),
    );
  }

  return clones;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type ReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any;
/* eslint-enable */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMirror<Fn extends (node: MapNode) => any>(fn: Fn) {
  return (node: MapNode): ReturnType<typeof fn> => {
    const mirror = [node.mirror].flat();
    mirrorContext.push(...mirror);
    const transform = fn(node);
    for (let i = 0; i < mirror.length; i++) mirrorContext.pop();
    return transform;
  };
}

// key -> InstancedMeshTransform[],
//   where `key` is node ID + clone index + parent ID + parent clone index + ...
const cache = new Map<string, InstancedMeshTransforms[]>();
// id -> key[],
//   list of all keys related to this id
const extraKeys = new Map<string, string[]>();
const getKey = <T extends { id: string }>(node: T, parents: T[]) =>
  `${node.id}+${parents.map((p) => p.id).join("+")}`;

const addTransformsToCache = (
  id: string,
  key: string,
  transforms: InstancedMeshTransforms[],
) => {
  const keys = extraKeys.get(id) ?? [];
  keys.push(key);
  extraKeys.set(id, keys);
  cache.set(key, transforms);
};

const getNodeAncestors = (index: NodesIndex, node: MapNode) => {
  if (!node.parent) return [];
  return [node.parent, ...index[node.parent].ancestorIds];
};
const getNodeDescendants = (index: NodesIndex, node: MapNode) => {
  if (!index[node.id]) return [];
  return [...index[node.id].descendantIds];
};

/**
 * Invalidate cached transforms for specified node ids
 */
export const invalidateCachedTransforms = (
  nodes: NodesMap,
  index: NodesIndex,
  ids: string[],
) => {
  const allIds = [...ids];

  for (const id of ids) {
    const node = nodes[id];

    if (node.parent) allIds.push(...getNodeAncestors(index, node));
    if (node.type === "group") allIds.push(...getNodeDescendants(index, node));
  }

  for (const id of allIds) {
    const keys = extraKeys.get(id) ?? [];
    extraKeys.set(id, []);
    for (const key of keys) cache.delete(key);
  }
};

export const getTransformsFromSubtree = (
  district: District,
  nodes: NodesMap,
  treeNodes: TreeNode[],
): InstancedMeshTransforms[] => {
  const transforms: InstancedMeshTransforms[] = [];

  const processNode = (
    treeNode: TreeNode,
    parents: MapNode[],
  ): InstancedMeshTransforms[] => {
    const node = nodes[treeNode.id];
    const key = getKey(node, parents);
    let transforms: InstancedMeshTransforms[];

    if (cache.has(key)) return cache.get(key) ?? noTransforms;

    if (node.type === "instance") {
      const clones = applyPattern(node);
      const resolveNode = pipe(
        applyParentTransform(parents.at(-1)!),
        applyHidden,
        applyCloned(parents),
        applyOffset,
      );
      const resolvedNodes = [node, ...clones].map(applyMirror(resolveNode));

      transforms = resolvedNodes.map((node) => nodeToTransform(node, district));
    } else {
      const clones = applyPattern(node);
      const resolveNode = pipe(
        applyParentTransform(parents.at(-1)!),
        applyHidden,
        applyCloned(parents),
      );
      const resolvedNodes = [node, ...clones].map(resolveNode);

      transforms = treeNode.children.flatMap((child) =>
        resolvedNodes.flatMap(
          applyMirror((parent) => processNode(child, [...parents, parent])),
        ),
      );
    }

    addTransformsToCache(node.id, key, transforms);

    return transforms;
  };

  for (const treeNode of treeNodes) {
    transforms.push(...processNode(treeNode, []));
  }

  return transforms;
};
