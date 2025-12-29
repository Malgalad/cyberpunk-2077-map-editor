import { nanoid } from "nanoid";
import { shallowEqual } from "react-redux";
import * as THREE from "three";

import { MAX_DEPTH } from "../constants.ts";
import type {
  District,
  GroupNodeCache,
  InstancedMeshTransforms,
  IntermediateGroupNodeCache,
  MapNode,
  MapNodeParsed,
  MapNodeUri,
} from "../types/types.ts";
import {
  applyTransforms,
  parseTransform,
  stringifyTransform,
} from "./transforms.ts";
import { unwrapDraft } from "./utilities.ts";

const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));
const fromEuler = (rotation: THREE.Euler) =>
  rotation.toArray().slice(0, 3) as THREE.Vector3Tuple;
const addTuples = (a: number[], b: number[]) =>
  a.map((x, i) => x + (b[i] ?? 0));
const scalePattern = (i: number) => (value: number) => value * (i + 1);

export function parseNode(node: MapNode): MapNodeParsed {
  return {
    ...parseTransform(node),
    pattern: node.pattern ? parseTransform(node.pattern) : undefined,
  };
}
export function stringifyNode(node: MapNodeParsed): MapNode {
  return {
    ...stringifyTransform(node),
    pattern: node.pattern ? stringifyTransform(node.pattern) : undefined,
  };
}

export function nodeToTransform(
  node: MapNodeParsed,
  district: District,
): InstancedMeshTransforms {
  const { cubeSize, origin, minMax } = district;

  const position = {
    x: (node.position[0] - origin.x) / minMax.x,
    y: (node.position[1] - origin.y) / minMax.y,
    z: (node.position[2] - origin.z) / minMax.z,
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
    x: node.scale[0] / cubeSize / 2,
    y: node.scale[1] / cubeSize / 2,
    z: node.scale[2] / cubeSize / 2,
    w: node.scale.every((n) => n === 1) ? 0 : 1,
  };

  return {
    id: node.id,
    virtual: node.virtual,
    originId: node.originId,
    index: node.index,
    position,
    orientation,
    scale,
  };
}

export const cloneNode = <T extends MapNode | MapNodeParsed>(
  nodes: T[],
  node: T,
  parentId: string,
  virtual = false,
): [T, ...T[]] => {
  const clone = structuredClone(unwrapDraft(node));
  const childClones: T[] = [];

  clone.id = nanoid();
  clone.parent = parentId;
  if (virtual) {
    clone.virtual = true;
    clone.originId = node.originId ?? node.id;
  }

  if (clone.type === "group") {
    const children = nodes.filter((child) => child.parent === node.id);

    for (const child of children) {
      childClones.push(...cloneNode(nodes, child, clone.id, virtual));
    }
  }

  return [clone, ...childClones];
};

export function normalizeNodes(nodes: MapNode[]): MapNode[] {
  const result: MapNode[] = [];
  const nodesMap = new Map(nodes.map((node) => [node.id, node]));
  const processed = new Set<string>();

  const processNode = (node: MapNode) => {
    if (processed.has(node.id)) return;

    if (nodesMap.has(node.parent)) {
      const parent = nodesMap.get(node.parent);
      if (parent && !processed.has(parent.id)) {
        processNode(parent);
      }
    }

    result.push(node);
    processed.add(node.id);
  };

  for (const node of nodes) {
    processNode(node);
  }

  return result;
}

// TODO performance - validate in background worker and defer updates
// TODO validate child nodes from parent pattern
export function validateNode(
  node: MapNode,
  map: Map<string, MapNodeParsed>,
  district: District,
): MapNode {
  if (node.type === "group") return node;

  const errors: string[] = [];
  const nodeParsed = applyTransforms(parseNode(node), map);
  const validatePosition = (position: THREE.Vector3Tuple) =>
    position[0] < district.position[0] + district.transMin[0] ||
    position[0] > district.position[0] + district.transMax[0] ||
    position[1] < district.position[1] + district.transMin[1] ||
    position[1] > district.position[1] + district.transMax[1] ||
    position[2] < district.position[2] + district.transMin[2] ||
    position[2] > district.position[2] + district.transMax[2];
  const validateScale = (scale: THREE.Vector3Tuple) =>
    scale[0] > district.cubeSize * 2 ||
    scale[1] > district.cubeSize * 2 ||
    scale[2] > district.cubeSize * 2 ||
    scale[0] < 0 ||
    scale[1] < 0 ||
    scale[2] < 0;

  if (validatePosition(nodeParsed.position)) {
    errors.push("Node is outside of district bounds");
  }
  if (validateScale(nodeParsed.scale)) {
    errors.push("Node is larger than district cube size or less than 0");
  }
  if (nodeParsed.pattern && nodeParsed.pattern.count > 0) {
    for (let i = 0; i < nodeParsed.pattern.count; i++) {
      const clone = { ...nodeParsed };

      clone.position = addTuples(
        clone.position,
        nodeParsed.pattern.position.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      clone.scale = addTuples(
        clone.scale,
        nodeParsed.pattern.scale.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      if (validatePosition(clone.position)) {
        errors.push("Pattern nodes are outside of district bounds");
        break;
      }
      if (validateScale(clone.scale)) {
        errors.push(
          "Pattern nodes are larger than district cube size or less than 0",
        );
        break;
      }
    }
  }

  const nodeErrors = errors.length === 0 ? undefined : errors;

  if (shallowEqual(nodeErrors, node.errors)) return node;

  return {
    ...node,
    errors: nodeErrors,
  };
}

const createCacheEntry = (): IntermediateGroupNodeCache[string] => ({
  instances: [],
  groups: [],
  nodes: [],
  additions: [],
  updates: [],
  deletions: [],
  errors: [],
  level: 0,
});

export const createGroupNodesCache = (nodes: MapNodeUri[]): GroupNodeCache => {
  const cache: IntermediateGroupNodeCache = {};
  const nodesMap = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const parent = cache[node.parent] ?? createCacheEntry();

    if (node.type === "instance") {
      parent.instances.push(node.id);
      if (node.tag === "create") parent.additions.push(node.id);
      if (node.tag === "update") parent.updates.push(node.id);
      if (node.tag === "delete") parent.deletions.push(node.id);
      if (node.hasErrors) parent.errors.push(node.id);
    } else {
      let depth = 0;
      let current: MapNodeUri | undefined = node;
      while (current) {
        current = nodesMap.get(current!.parent);
        depth += 1;
      }

      const self = cache[node.id] ?? createCacheEntry();
      self.level = depth;
      // push reference to the array of own children ids to flatten later
      parent.groups.push(node.id, self.groups);
      parent.instances.push(self.instances);
      parent.errors.push(self.errors);

      if (node.tag === "create") parent.additions.push(self.additions);
      if (node.tag === "update") parent.updates.push(self.updates);
      if (node.tag === "delete") parent.deletions.push(self.deletions);
      if (node.hasErrors) parent.errors.push(node.id);

      cache[node.id] = self;
    }

    cache[node.parent] = parent;
  }

  // flatten NestedArray<string>[] to string[]
  for (const entry of Object.values(cache)) {
    entry.groups = entry.groups.flat(MAX_DEPTH);
    entry.instances = entry.instances.flat(MAX_DEPTH);
    entry.nodes = [...entry.groups, ...entry.instances];
    entry.additions = entry.additions.flat(MAX_DEPTH);
    entry.updates = entry.updates.flat(MAX_DEPTH);
    entry.deletions = entry.deletions.flat(MAX_DEPTH);
    entry.errors = entry.errors.flat(MAX_DEPTH);
  }

  return cache as GroupNodeCache;
};

export function getNodeDistrict(
  nodesOrMap: MapNode[] | Map<string, MapNodeParsed>,
  node: MapNode | MapNodeParsed,
) {
  const map =
    nodesOrMap instanceof Map
      ? nodesOrMap
      : new Map(nodesOrMap.map((node) => [node.id, parseNode(node)]));

  let current = node.parent;

  while (map.has(current)) {
    current = map.get(current)!.parent;
  }

  return current;
}

export function transplantNode(
  nodesOrMap: MapNode[] | Map<string, MapNodeParsed>,
  node: MapNode,
  parentId: string,
): MapNode {
  const map =
    nodesOrMap instanceof Map
      ? nodesOrMap
      : new Map(nodesOrMap.map((node) => [node.id, parseNode(node)]));
  const nodeParsed = parseNode(node);
  const nodeTransforms = applyTransforms(nodeParsed, map);

  if (!map.has(parentId)) {
    return stringifyNode({
      ...nodeTransforms,
      parent: parentId,
      district: parentId,
    });
  }

  const parent = map.get(parentId)!;
  const district = getNodeDistrict(nodesOrMap, parent);
  const negateRotation = parent.rotation.map(
    (n) => n * -1,
  ) as THREE.Vector3Tuple;
  const parentRotation = toQuaternion(negateRotation);
  const parentTransforms = applyTransforms(parent, map);
  const position = [
    nodeTransforms.position[0] - parentTransforms.position[0],
    nodeTransforms.position[1] - parentTransforms.position[1],
    nodeTransforms.position[2] - parentTransforms.position[2],
  ] as THREE.Vector3Tuple;
  const object = new THREE.Object3D();
  object.rotation.setFromQuaternion(
    toQuaternion(nodeParsed.rotation).multiply(parentRotation),
  );
  object.position.fromArray(position);
  object.position.applyQuaternion(parentRotation);

  return stringifyNode({
    ...nodeTransforms,
    parent: parentId,
    district,
    position: object.position.toArray(),
    rotation: fromEuler(object.rotation),
  });
}
