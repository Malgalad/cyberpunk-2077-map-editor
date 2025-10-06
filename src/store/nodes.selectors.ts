import { createSelector } from "@reduxjs/toolkit";
import * as THREE from "three";

import type { InstancedMeshTransforms, MapNodeParsed } from "../types.ts";
import {
  applyParentTransform,
  cloneNode,
  hadamardSum,
  nodeToTransform,
  prepareNode,
} from "../utilities.ts";
import districtSlice from "./district.ts";
import nodesSlice from "./nodes.ts";

const scalePattern = (i: number) => (value: number) => value * (i + 1);
const noTransforms: InstancedMeshTransforms[] = [];

export const getNodesInstancedMeshTransforms = createSelector(
  [
    districtSlice.selectors.getDistrictData,
    districtSlice.selectors.getDistrictCenter,
    nodesSlice.selectors.getNodes,
  ],
  (districtData, districtCenter, nodes): InstancedMeshTransforms[] => {
    if (!districtData || !districtCenter) return noTransforms;

    const instanceTransforms: InstancedMeshTransforms[] = [];

    // reverse array to ensure child patterns are resolved before parent patterns
    const reversedNodes: MapNodeParsed[] = nodes.map(prepareNode).toReversed();
    const { cubeSize } = districtData;
    const { origin, minMax } = districtCenter;

    for (const node of reversedNodes) {
      if (!node.pattern?.enabled) continue;

      for (let i = 0; i < node.pattern.count; i++) {
        const virtualNodes = cloneNode(reversedNodes, node, node.parent, {
          cloneLabel: false,
        });

        for (const clone of virtualNodes) {
          clone.virtual = true;
        }

        const position = hadamardSum(
          virtualNodes[0].position,
          node.pattern.position.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        const rotation = hadamardSum(
          virtualNodes[0].rotation,
          node.pattern.rotation.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        const scale = hadamardSum(
          virtualNodes[0].scale,
          node.pattern.scale.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        virtualNodes.splice(0, 1, {
          ...virtualNodes[0],
          pattern: undefined,
          position,
          rotation,
          scale,
        });

        reversedNodes.push(...virtualNodes);
      }
    }

    for (const node of reversedNodes) {
      if (node.type === "instance") {
        let current = node;
        let parentId = current.parent;

        while (parentId !== districtData.name) {
          const parent = reversedNodes.find((parent) => parent.id === parentId);
          if (!parent) break;
          current = applyParentTransform(current, parent);
          parentId = parent.parent;
        }

        current.position[2] += current.scale[2] / 2;

        const transformedNode = nodeToTransform(
          current,
          origin,
          minMax,
          cubeSize,
        );

        instanceTransforms.push(transformedNode);
      }
    }

    return instanceTransforms;
  },
);
