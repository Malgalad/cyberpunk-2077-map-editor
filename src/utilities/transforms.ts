import * as THREE from "three";

import { loadURLAsArrayBuffer } from "../helpers.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import { decodeImageData } from "../map3d/processDDS.ts";
import type {
  District,
  DistrictProperties,
  InstancedMeshTransforms,
  MapNode,
  MapNodeParsed,
  Transform,
  TransformParsed,
} from "../types/types.ts";
import { cloneNode, nodeToTransform, parseNode } from "./nodes.ts";
import { invariant, toNumber, toString } from "./utilities.ts";

const hadamardProduct = (a: number[], b: number[]) =>
  a.map((x, i) => x * (b[i] ?? 0));
const addTuples = (a: number[], b: number[]) =>
  a.map((x, i) => x + (b[i] ?? 0));
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

  object.position.fromArray(hadamardProduct(node.position, parent.scale));
  object.position.add(parentPosition);
  object.rotation.fromArray(node.rotation);
  object.scale.fromArray(node.scale);

  object.applyQuaternion(parentRotation);
  object.position.sub(parentPosition);
  object.position.applyQuaternion(parentRotation);
  object.position.add(parentPosition);

  const scale = hadamardProduct(node.scale, parent.scale);

  return {
    ...node,
    position: object.position.toArray(),
    rotation: object.rotation.toArray().slice(0, 3),
    scale,
  };
}

export function applyTransforms(
  node: MapNodeParsed,
  nodes: Map<string, MapNodeParsed>,
) {
  let current = node;
  let parentId = current.parent;

  while (nodes.has(parentId)) {
    const parent = nodes.get(parentId)!;

    current = applyParentTransform(current, parent);
    parentId = parent.parent;
  }

  return current;
}

export function projectNodesToDistrict(
  nodes: MapNode[],
  district: District | undefined,
  shiftZOrigin: boolean = false,
): InstancedMeshTransforms[] {
  if (!district) return noTransforms;

  const transforms: InstancedMeshTransforms[] = [];
  const nodesParsed = nodes.map(parseNode);
  const nodesMap = new Map(nodesParsed.map((node) => [node.id, node]));

  // iterate in reverse order to ensure child patterns are resolved before parent patterns
  for (let i = nodesParsed.length - 1; i >= 0; i--) {
    const node = nodesParsed[i];

    invariant(node, "Unexpected error: node is undefined");

    if (node.hidden) node.scale = [0, 0, 0];
    if (!node.pattern || node.virtual) continue;

    for (let i = 0; i < node.pattern.count; i++) {
      const clones = cloneNode(nodesParsed, node, node.parent, true);

      for (const clone of clones) {
        nodesMap.set(clone.id, clone);
      }

      invariant(clones[0], "Unexpected error: clones[0] is undefined");

      clones[0].position = addTuples(
        clones[0].position,
        node.pattern.position.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      clones[0].rotation = addTuples(
        clones[0].rotation,
        node.pattern.rotation.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      clones[0].scale = addTuples(
        clones[0].scale,
        node.pattern.scale.map(scalePattern(i)),
      ) as THREE.Vector3Tuple;

      nodesParsed.push(...clones);
    }
  }

  for (const node of nodesParsed) {
    if (node.type === "group") continue;

    const resolved = applyTransforms(node, nodesMap);
    // set node Z transform origin to bottom instead of center
    if (shiftZOrigin) resolved.position[2] += resolved.scale[2] / 2;
    transforms.push(nodeToTransform(resolved, district));
  }

  return transforms;
}

export async function getDistrictTransforms(district: DistrictProperties) {
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

export function stringifyTransform<K>(
  transform: TransformParsed & K,
): Transform & K {
  return {
    ...transform,
    position: transform.position.map(toString) as Transform["position"],
    rotation: transform.rotation
      .map(THREE.MathUtils.radToDeg)
      .map(toString) as Transform["rotation"],
    scale: transform.scale.map(toString) as Transform["scale"],
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
  ].map(toString) as MapNode["position"];
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
    .map(toString) as MapNode["rotation"];
  const scale = [
    transform.scale.x * 2 * cubeSize,
    transform.scale.y * 2 * cubeSize,
    transform.scale.z * 2 * cubeSize,
  ].map(toString) as MapNode["scale"];

  return {
    ...properties,
    type: "instance",
    position,
    rotation,
    scale,
  } satisfies MapNode as MapNode;
}
