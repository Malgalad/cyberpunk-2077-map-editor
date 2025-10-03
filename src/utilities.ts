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

export const deg2rad = THREE.MathUtils.degToRad;
export const rad2deg = THREE.MathUtils.radToDeg;

export const hadamardProduct = (a: number[], b: number[]) =>
  a.map((x, i) => x * b[i]);
// export const addQuaternions = (
//   a: THREE.QuaternionTuple,
//   b: THREE.QuaternionTuple,
// ) => {
//   const ea = toEulerAngles(a) as [number, number, number];
//   const eb = toEulerAngles(b) as [number, number, number];
//
//   return toQuaternion(ea.map((x, i) => x + eb[i]) as [number, number, number]);
// };

export function toNumber(value: string) {
  const number = parseFloat(value.trim());
  return Number.isNaN(number) ? 0 : number;
}
export function toString(value: number) {
  return value.toString();
}

// export function toQuaternion([roll, pitch, yaw]: [Decimal, Decimal, Decimal]): [
//   Decimal,
//   Decimal,
//   Decimal,
//   Decimal,
// ] {
//   const cosRoll = roll.mul(0.5).cos();
//   const sinRoll = roll.mul(0.5).sin();
//   const cosPitch = pitch.mul(0.5).cos();
//   const sinPitch = pitch.mul(0.5).sin();
//   const cosYaw = yaw.mul(0.5).cos();
//   const sinYaw = yaw.mul(0.5).sin();
//
//   return [
//     sinRoll.mul(cosPitch).mul(cosYaw).sub(cosRoll.mul(sinPitch).mul(sinYaw)),
//     cosRoll.mul(sinPitch).mul(cosYaw).add(sinRoll.mul(cosPitch).mul(sinYaw)),
//     cosRoll.mul(cosPitch).mul(sinYaw).sub(sinRoll.mul(sinPitch).mul(cosYaw)),
//     cosRoll.mul(cosPitch).mul(cosYaw).add(sinRoll.mul(sinPitch).mul(sinYaw)),
//   ];
// }

function prepareTransform<K>(transform: Transform & K): TransformParsed & K {
  return {
    ...transform,
    position: transform.position.map(toNumber) as [number, number, number],
    rotation: transform.rotation.map(toNumber).map(deg2rad) as [
      number,
      number,
      number,
    ],
    scale: transform.scale.map(toNumber) as [number, number, number],
  };
}

export function prepareNode(node: MapNode): MapNodeParsed {
  return {
    ...prepareTransform(node),
    pattern: node.pattern ? prepareTransform(node.pattern) : undefined,
  };
}

// export function toEulerAngles([x, y, z, w]: [
//   Decimal,
//   Decimal,
//   Decimal,
//   Decimal,
// ]): [Decimal, Decimal, Decimal] {
//   const sinr_cosp = new Decimal(2).mul(w.mul(x).add(y.mul(z)));
//   const cosr_cosp = new Decimal(1).sub(
//     new Decimal(2).mul(x.pow(2).add(y.pow(2))),
//   );
//   const roll = Decimal.atan2(sinr_cosp, cosr_cosp);
//
//   const sinp = Decimal.sqrt(
//     new Decimal(1).add(new Decimal(2).mul(w.mul(y).sub(x.mul(z)))),
//   );
//   const cosp = Decimal.sqrt(
//     new Decimal(1).sub(new Decimal(2).mul(w.mul(y).sub(x.mul(z)))),
//   );
//   const pitch = new Decimal(2)
//     .mul(Decimal.atan2(sinp, cosp))
//     .sub(new Decimal(Math.PI / 2));
//
//   const siny_cosp = new Decimal(2).mul(w.mul(z).add(x.mul(y)));
//   const cosy_cosp = new Decimal(1).sub(
//     new Decimal(2).mul(y.pow(2).add(z.pow(2))),
//   );
//   const yaw = Decimal.atan2(siny_cosp, cosy_cosp);
//
//   return [roll, pitch, yaw];
// }

export function applyParentTransform<Node extends TransformParsed>(
  node: Node,
  parent: TransformParsed,
): Node {
  const parentRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler().fromArray(parent.rotation),
  );
  const parentPosition = new THREE.Vector3().fromArray(parent.position);

  const object = new THREE.Object3D();
  object.position.fromArray(node.position);
  object.rotation.fromArray(node.rotation);
  object.scale.fromArray(node.scale);

  object.applyQuaternion(parentRotation);
  object.position.sub(parentPosition);
  object.position.applyQuaternion(parentRotation);
  object.position.add(parentPosition);
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
