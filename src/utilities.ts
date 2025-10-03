import { isDraft, original, type WritableDraft } from "immer";
import { nanoid } from "nanoid";
import * as THREE from "three";

import type { InstanceTransforms } from "./map3d/importDDS.ts";
import type {
  MapNode,
  MapNodeParsed,
  Transform,
  TransformParsed,
} from "./types.ts";

export const hadamardProduct = (a: number[], b: number[]) =>
  a.map((x, i) => x * b[i]);

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}
export function toString(value: number) {
  return value.toString();
}

function prepareTransform<K>(transform: Transform & K): TransformParsed & K {
  return {
    ...transform,
    position: transform.position.map(toNumber) as THREE.Vector3Tuple,
    rotation: transform.rotation
      .map(toNumber)
      .map(THREE.MathUtils.degToRad) as THREE.EulerTuple,
    scale: transform.scale.map(toNumber) as THREE.Vector3Tuple,
  };
}

export function prepareNode(node: MapNode): MapNodeParsed {
  return {
    ...prepareTransform(node),
    pattern: node.pattern ? prepareTransform(node.pattern) : undefined,
  };
}

export function applyParentTransform<Node extends TransformParsed>(
  node: Node,
  parent: TransformParsed,
): Node {
  const parentPosition = new THREE.Vector3().fromArray(parent.position);
  const parentRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(parent.rotation),
  );
  const nodePosition = new THREE.Vector3().fromArray(node.position);

  const object = new THREE.Object3D();
  object.position.copy(nodePosition);
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
    rotation: object.rotation.toArray(),
    scale,
  };
}

export function nodeToTransform(
  node: MapNodeParsed,
  origin: THREE.Vector3,
  minMax: THREE.Vector4,
  cubeSize: number,
): InstanceTransforms {
  const position = {
    x: (node.position[0] - origin.x) / minMax.x,
    y: (node.position[1] - origin.y) / minMax.y,
    z: (node.position[2] - origin.z) / minMax.z,
    w: 0,
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
    position,
    orientation,
    scale,
  };
}

export function clsx(...args: unknown[]) {
  return args.flat().filter(Boolean).join(" ");
}

export const cloneNode = (
  nodes: WritableDraft<MapNode>[],
  node: WritableDraft<MapNode>,
  parentId: string = node.parent,
) => {
  const clone = structuredClone(
    isDraft(node) ? (original(node) as MapNode) : node,
  );
  const childClones: MapNode[] = [];

  clone.id = `${node.type}-${nanoid(8)}`;
  clone.label = clone.id;
  clone.parent = parentId;

  if (clone.type === "group") {
    const children = nodes.filter((child) => child.parent === node.id);

    for (const child of children) {
      childClones.push(...cloneNode(nodes, child, clone.id));
    }
  }

  return [clone, ...childClones];
};

export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
