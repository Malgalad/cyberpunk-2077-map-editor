import * as THREE from "three";

import { loadURLAsArrayBuffer } from "../helpers.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import { decodeImageData } from "../map3d/processDDS.ts";
import type {
  District,
  DistrictData,
  InstancedMeshTransforms,
  MapNode,
  MapNodeParsed,
  Transform,
  TransformParsed,
} from "../types/types.ts";
import {
  cloneNode,
  nodeToTransform,
  normalizeDistrictNodes,
  parseNode,
} from "./nodes.ts";
import { invariant, toNumber, toString, unwrapDraft } from "./utilities.ts";

const hadamardProduct = (a: number[], b: number[]) => a.map((x, i) => x * b[i]);
const addTuples = (a: number[], b: number[]) => a.map((x, i) => x + b[i]);
const scalePattern = (i: number) => (value: number) => value * (i + 1);
const noTransforms: InstancedMeshTransforms[] = [];

export function applyParentTransform<Node extends TransformParsed>(
  node: Node,
  parent: TransformParsed,
): Node {
  const parentPosition = new THREE.Vector3().fromArray(parent.position);
  const parentRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(parent.rotation),
  );

  const object = new THREE.Object3D();

  object.position.fromArray(node.position);
  object.position.add(parentPosition);
  object.rotation.fromArray(node.rotation);
  object.scale.fromArray(node.scale);

  object.applyQuaternion(parentRotation);
  object.position.sub(parentPosition);
  object.position.applyQuaternion(parentRotation);
  object.position.add(parentPosition);

  // TODO scale distance as well
  const scale = hadamardProduct(node.scale, parent.scale);

  return {
    ...node,
    position: object.position.toArray(),
    rotation: object.rotation.toArray(),
    scale,
  };
}

export function projectNodesToDistrict(
  nodes: MapNode[],
  district: District | undefined,
  shiftZOrigin: boolean = false,
): InstancedMeshTransforms[] {
  if (!district) return noTransforms;

  const transforms: InstancedMeshTransforms[] = [];
  // normalize then reverse the node array to ensure child patterns are resolved before parent patterns
  const reversedNodes = normalizeDistrictNodes(nodes, district)
    .map(unwrapDraft)
    .map(parseNode)
    .toReversed();

  for (const node of reversedNodes) {
    if (!node.pattern?.enabled || node.virtual) continue;

    for (let i = 0; i < node.pattern.count; i++) {
      const virtualNodes = cloneNode(reversedNodes, node, node.parent);

      for (const clone of virtualNodes) {
        clone.virtual = true;
      }

      const position = addTuples(
        virtualNodes[0].position,
        node.pattern.position.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      const rotation = addTuples(
        virtualNodes[0].rotation,
        node.pattern.rotation.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      const scale = addTuples(
        virtualNodes[0].scale,
        node.pattern.scale.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      virtualNodes.splice(0, 1, {
        ...virtualNodes[0],
        position,
        rotation,
        scale,
      });

      reversedNodes.push(...virtualNodes);
    }
  }

  const parents = new Map<string, MapNodeParsed>();
  for (const node of reversedNodes) {
    if (node.type === "group") continue;

    let current = node;
    let parentId = current.parent;

    while (parentId !== district.name) {
      let parent: MapNodeParsed;

      if (parents.has(parentId)) {
        parent = parents.get(parentId)!;
      } else {
        const maybeParent = reversedNodes.find(
          (parent) => parent.id === parentId,
        );
        invariant(
          maybeParent,
          `Cannot find parent ${parentId} for node ${node.id}`,
        );
        parent = maybeParent;
        parents.set(parentId, parent);
      }

      current = applyParentTransform(current, parent);
      parentId = parent.parent;
    }

    if (shiftZOrigin) {
      // set node Z transform origin to bottom instead of center
      current.position[2] += current.scale[2] / 2;
    }

    const transform = nodeToTransform(current, district);

    transforms.push(transform);
  }

  return transforms;
}

export async function getDistrictTransforms(district: DistrictData) {
  if (district.isCustom) return [];

  const arrayBuffer = await loadURLAsArrayBuffer(
    `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
  );

  return decodeImageData(new Uint16Array(arrayBuffer));
}

export function parseTransform<K>(
  transform: Transform & K,
): TransformParsed & K {
  return {
    ...transform,
    position: transform.position.map(toNumber) as THREE.Vector3Tuple,
    rotation: transform.rotation
      .map(toNumber)
      .map(THREE.MathUtils.degToRad) as THREE.Vector3Tuple,
    scale: transform.scale.map(toNumber) as THREE.Vector3Tuple,
  };
}

export function transformToNode(
  transform: InstancedMeshTransforms,
  district: District,
  properties: Pick<MapNode, "label" | "parent" | "tag" | "id">,
): MapNode {
  const { cubeSize, origin, minMax } = district;
  const position = [
    transform.position.x * minMax.x + origin.x,
    transform.position.y * minMax.y + origin.y,
    transform.position.z * minMax.z + origin.z,
  ].map(toString) as [string, string, string];
  const rotation = new THREE.Euler()
    .setFromQuaternion(
      new THREE.Quaternion(
        transform.orientation.x,
        transform.orientation.y,
        transform.orientation.z,
        transform.orientation.w,
      ),
    )
    .toArray()
    .slice(0, 3)
    .map((angle) => THREE.MathUtils.radToDeg(angle as number))
    .map(toString) as [string, string, string];
  const scale = [
    transform.scale.x * 2 * cubeSize,
    transform.scale.y * 2 * cubeSize,
    transform.scale.z * 2 * cubeSize,
  ].map(toString) as [string, string, string];

  return {
    ...properties,
    type: "instance",
    position,
    rotation,
    scale,
  } satisfies MapNode as MapNode;
}
