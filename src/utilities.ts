import { isDraft, original, type WritableDraft } from "immer";
import { nanoid } from "nanoid";
import * as THREE from "three";

import { frustumSize } from "./map3d/map3d.base.ts";
import type {
  InstancedMeshTransforms,
  MapNode,
  MapNodeParsed,
  Transform,
  TransformParsed,
} from "./types.ts";

export const hadamardProduct = (a: number[], b: number[]) =>
  a.map((x, i) => x * b[i]);
export const addTuples = (a: number[], b: number[]) =>
  a.map((x, i) => x + b[i]);

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}
export function toString(value: number) {
  return value.toString();
}

export function prepareTransform<K>(
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
): InstancedMeshTransforms {
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
export function transformToNode(
  id: string,
  parentId: string,
  transform: InstancedMeshTransforms,
  origin: THREE.Vector3,
  minMax: THREE.Vector4,
  cubeSize: number,
): MapNode {
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
    .map((angle) => THREE.MathUtils.radToDeg(angle as number))
    .map(toString) as [string, string, string];
  const scale = [
    transform.scale.x * 2 * cubeSize,
    transform.scale.y * 2 * cubeSize,
    transform.scale.z * 2 * cubeSize,
  ].map(toString) as [string, string, string];

  return {
    id,
    virtual: transform.virtual,
    type: "instance",
    label: id,
    parent: parentId,
    position,
    rotation,
    scale,
  } satisfies MapNode as MapNode;
}

export function lookAtTransform(
  transform: InstancedMeshTransforms,
  origin: THREE.Vector3,
  minMax: THREE.Vector4,
): [THREE.Vector3, number] {
  const position = new THREE.Vector3().fromArray([
    transform.position.x * minMax.x + origin.x,
    transform.position.z * minMax.z + origin.z,
    -(transform.position.y * minMax.y + origin.y),
  ]);
  const approximateScale =
    ((transform.scale.x + transform.scale.y) / 2) * 2 * 200;
  const zoom = Math.min(100, Math.floor(frustumSize / 2 / approximateScale));

  return [position, zoom];
}

export function clsx(...args: unknown[]) {
  return args.flat().filter(Boolean).join(" ");
}

export const cloneNode = <T extends MapNode | MapNodeParsed>(
  nodes: WritableDraft<T>[],
  node: WritableDraft<T>,
  parentId: string,
): T[] => {
  const clone = structuredClone(isDraft(node) ? (original(node) as T) : node);
  const childClones: T[] = [];

  clone.id = nanoid(8);
  clone.label = `${clone.type === "instance" ? "Box" : "Group"}`;
  clone.parent = parentId;

  if (clone.type === "group") {
    const children = nodes.filter((child) => child.parent === node.id);

    for (const child of children) {
      childClones.push(...cloneNode(nodes, child, clone.id));
    }
  }

  return [clone as T, ...childClones];
};

export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function zip(jsonString: string): Promise<Blob> {
  const textEncoder = new TextEncoder();
  const encodedData = textEncoder.encode(jsonString);

  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encodedData);
      controller.close();
    },
  });

  const compressedStream = readableStream.pipeThrough(
    new CompressionStream("gzip"),
  );

  return new Response(compressedStream).blob();
}

export async function unzip(compressedData: ReadableStream): Promise<string> {
  const decompressedStream = compressedData.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const decompressedBlob = await new Response(decompressedStream).blob();

  const decompressedArrayBuffer = await decompressedBlob.arrayBuffer();
  const textDecoder = new TextDecoder();

  return textDecoder.decode(decompressedArrayBuffer);
}
