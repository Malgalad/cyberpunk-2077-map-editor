import * as THREE from "three";

import { STATIC_ASSETS } from "../map3d/constants.ts";
import { decodeImageData } from "../map3d/processDDS.ts";
import type {
  District,
  DistrictProperties,
  InstancedMeshTransforms,
  MapNodeV2,
  NodesMap,
  Plane,
  TreeNode,
} from "../types/types.ts";
import { nodeToTransform } from "./nodes.ts";
import { pipe } from "./utilities.ts";

type Tuple3<T> = [T, T, T];
const toTuple3 = <T>(array: T[]) => array.slice(0, 3) as Tuple3<T>;

const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));
const hadamardProduct = (a: number[], b: number[]) =>
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

export function applyParentTransform(parent: MapNodeV2 | null) {
  return (node: MapNodeV2): MapNodeV2 => {
    if (!parent) return node;

    const parentPosition = new THREE.Vector3().fromArray(parent.position);
    const parentRotation = toQuaternion(parent.rotation);

    const object = new THREE.Object3D();

    object.position.fromArray(
      hadamardProduct(
        mirrorPosition(node.mirror || parent.mirror, node.position),
        parent.scale,
      ),
    );
    object.rotation.fromArray(
      mirrorRotation(node.mirror || parent.mirror, node.rotation),
    );
    object.scale.fromArray(hadamardProduct(node.scale, parent.scale));

    object.applyQuaternion(parentRotation);
    object.position.applyQuaternion(parentRotation);
    object.position.add(parentPosition);

    return {
      ...node,
      position: object.position.toArray(),
      rotation: toTuple3(object.rotation.toArray() as number[]),
      scale: object.scale.toArray(),
    };
  };
}

export function applyTransforms(nodes: NodesMap, node: MapNodeV2) {
  let current = node;
  let parentId = current.parent;

  while (parentId) {
    const parent = nodes[parentId];

    current = applyParentTransform(parent)(current);
    parentId = parent.parent;
  }

  return current;
}

function applyDistrict(district: District) {
  return (node: MapNodeV2): MapNodeV2 => {
    return {
      ...node,
      position: toTuple3([
        node.position[0] - district.origin.x,
        node.position[1] - district.origin.y,
        node.position[2] - district.origin.z,
      ]),
    };
  };
}

function applyHidden(node: MapNodeV2): MapNodeV2 {
  if (node.hidden) return { ...node, scale: [0, 0, 0] };
  return node;
}

function applyCloned(parents: MapNodeV2[]) {
  return (node: MapNodeV2): MapNodeV2 => {
    const isCloned = parents.some((parent) => parent.virtual);
    if (!isCloned || node.virtual) return node;
    return { ...node, virtual: true, originId: node.id };
  };
}

function applyOffset(node: MapNodeV2): MapNodeV2 {
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

function applyPattern(node: MapNodeV2): MapNodeV2[] {
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

  const clones: MapNodeV2[] = Array(node.pattern.count)
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

const cache = new Map<string, InstancedMeshTransforms[]>();
const extraKeys = new Map<string, string[]>();
const getKey = <T extends { id: string }>(node: T, parents: T[]) =>
  `${node.id}+${parents.map((p) => p.id).join("+")}`;

export const addTransformsToCache = (
  id: string,
  key: string,
  transforms: InstancedMeshTransforms[],
) => {
  const keys = extraKeys.get(id) ?? [];
  keys.push(key);
  extraKeys.set(id, keys);
  cache.set(key, transforms);
};
export const invalidateCachedTransforms = (ids: string[]) => {
  for (const id of ids) {
    const keys = extraKeys.get(id) ?? [];
    extraKeys.set(id, []);
    for (const key of keys) cache.delete(key);
  }
};
export const invalidateCache = () => {
  cache.clear();
  extraKeys.clear();
};

export const projectNodesToDistrict = (
  district: District,
  nodes: NodesMap,
  treeNodes: TreeNode[],
): InstancedMeshTransforms[] => {
  if (!district) return noTransforms;

  const transforms: InstancedMeshTransforms[] = [];

  const processNode = (
    treeNode: TreeNode,
    parents: MapNodeV2[],
  ): InstancedMeshTransforms[] => {
    const node = nodes[treeNode.id];
    const key = getKey(node, parents);
    let transforms: InstancedMeshTransforms[] = [];

    if (cache.has(key)) return cache.get(key) ?? noTransforms;

    if (node.type === "instance") {
      const clones = applyPattern(node);
      const resolveNode = pipe(
        applyParentTransform(parents.at(-1)!),
        applyHidden,
        applyCloned(parents),
        applyOffset,
        applyDistrict(district),
      );
      const resolvedNodes = [node, ...clones].map(resolveNode);

      transforms = resolvedNodes.map(nodeToTransform);
    } else {
      const clones = applyPattern(node);
      const resolveNode = pipe(
        applyParentTransform(parents.at(-1)!),
        applyHidden,
        applyCloned(parents),
      );
      const resolvedNodes = [node, ...clones].map(resolveNode);

      transforms = treeNode.children.flatMap((child) =>
        resolvedNodes.flatMap((parent) =>
          processNode(child, [...parents, parent]),
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

export async function fetchDistrictTransforms(district: DistrictProperties) {
  if (district.isCustom) return [];

  const arrayBuffer = await fetch(
    `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
  ).then((res) => res.arrayBuffer());

  return decodeImageData(new Uint16Array(arrayBuffer));
}

export function transformToNode(
  transform: InstancedMeshTransforms,
  district: District,
  properties: Pick<
    MapNodeV2,
    "label" | "parent" | "district" | "tag" | "id" | "indexInDistrict"
  >,
): MapNodeV2 {
  const position = toTuple3([
    transform.position.x + district.origin.x,
    transform.position.y + district.origin.y,
    transform.position.z + district.origin.z,
  ]);
  const rotation = toTuple3(
    new THREE.Euler()
      .setFromQuaternion(
        new THREE.Quaternion(
          transform.orientation.x,
          transform.orientation.y,
          transform.orientation.z,
          transform.orientation.w,
        ),
      )
      .toArray() as number[],
  );
  const scale = toTuple3([
    transform.scale.x,
    transform.scale.y,
    transform.scale.z,
  ]);
  const mirror = null;

  return {
    ...properties,
    type: "instance",
    hidden: false,
    position,
    rotation,
    scale,
    mirror,
  } satisfies MapNodeV2 as MapNodeV2;
}

export const unclampTransform =
  (district: District) => (transform: InstancedMeshTransforms) => {
    const { cubeSize, minMax } = district;

    const position = {
      x: transform.position.x * minMax.x,
      y: transform.position.y * minMax.y,
      z: transform.position.z * minMax.z,
      w: 1,
    };
    const scale = {
      x: transform.scale.x * cubeSize * 2,
      y: transform.scale.y * cubeSize * 2,
      z: transform.scale.z * cubeSize * 2,
      w: 1,
    };

    return {
      ...transform,
      position,
      scale,
    };
  };

export const clampTransforms =
  (district: District) => (transform: InstancedMeshTransforms) => {
    const { cubeSize, minMax } = district;

    const position = {
      x: transform.position.x / minMax.x,
      y: transform.position.y / minMax.y,
      z: transform.position.z / minMax.z,
      w: 1,
    };
    const scale = {
      x: transform.scale.x / cubeSize / 2,
      y: transform.scale.y / cubeSize / 2,
      z: transform.scale.z / cubeSize / 2,
      w: 1,
    };

    return {
      ...transform,
      position,
      scale,
    };
  };
