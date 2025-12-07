import { nanoid } from "nanoid";
import { shallowEqual } from "react-redux";
import * as THREE from "three";

import type {
  District,
  InstancedMeshTransforms,
  MapNode,
  MapNodeParsed,
} from "../types/types.ts";
import { applyTransforms, parseTransform } from "./transforms.ts";
import { unwrapDraft } from "./utilities.ts";

const addTuples = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);
const scalePattern = (i: number) => (value: number) => value * (i + 1);

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

export function normalizeNodes(
  nodes: MapNode[],
  nodesMap: Map<string, MapNode>,
): MapNode[] {
  const result: MapNode[] = [];
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
export function validateNode(
  node: MapNode,
  map: Map<string, MapNodeParsed>,
  district: District,
): MapNode {
  const errors: string[] = [];
  const nodeParsed = applyTransforms(parseNode(node), map);
  const validatePosition = (position: number[]) =>
    position[0] < district.position[0] + district.transMin[0] ||
    position[0] > district.position[0] + district.transMax[0] ||
    position[1] < district.position[1] + district.transMin[1] ||
    position[1] > district.position[1] + district.transMax[1] ||
    position[2] < district.position[2] + district.transMin[2] ||
    position[2] > district.position[2] + district.transMax[2];
  const validateScale = (scale: number[]) =>
    scale[0] > district.cubeSize ||
    scale[1] > district.cubeSize ||
    scale[2] > district.cubeSize;

  if (validatePosition(nodeParsed.position)) {
    errors.push("Node is outside of district bounds");
  }
  if (validateScale(nodeParsed.scale)) {
    errors.push("Node is larger than district cube size");
  }
  if (nodeParsed.pattern?.enabled && nodeParsed.pattern.count > 0) {
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
        errors.push("Pattern nodes are larger than district cube size");
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
