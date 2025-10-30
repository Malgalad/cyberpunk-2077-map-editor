import { nanoid } from "nanoid";
import * as THREE from "three";

import type {
  District,
  DistrictData,
  InstancedMeshTransforms,
  MapNode,
  MapNodeParsed,
} from "../types/types.ts";
import { parseTransform } from "./transforms.ts";
import { unwrapDraft } from "./utilities.ts";

export function parseNode(node: MapNode): MapNodeParsed {
  return {
    ...parseTransform(node),
    pattern: node.pattern ? parseTransform(node.pattern) : undefined,
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
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(node.rotation),
  );
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
    w: 1,
  };

  return {
    id: node.id,
    virtual: node.virtual,
    position,
    orientation,
    scale,
  };
}

export const cloneNode = <T extends MapNode | MapNodeParsed>(
  nodes: T[],
  node: T,
  parentId: string,
): T[] => {
  const clone = structuredClone(unwrapDraft(node));
  const childClones: T[] = [];

  clone.id = nanoid(8);
  clone.label = clone.type === "instance" ? "Box" : "Group";
  clone.parent = parentId;

  if (clone.type === "group") {
    const children = nodes.filter((child) => child.parent === node.id);

    for (const child of children) {
      childClones.push(...cloneNode(nodes, child, clone.id));
    }
  }

  return [clone, ...childClones];
};

export function normalizeDistrictNodes(
  nodes: MapNode[],
  district: DistrictData,
): MapNode[] {
  const result: MapNode[] = [];
  const processed = new Set<string>();
  const nodesMap = new Map(nodes.map((node) => [node.id, node]));

  const processNode = (node: MapNode) => {
    if (processed.has(node.id)) return;

    if (node.parent !== district.name) {
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
