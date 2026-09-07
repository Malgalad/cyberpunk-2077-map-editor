import * as THREE from "three";

import type { MapNode } from "../types/types.ts";
import { fromQuaternion, fromVector3 } from "./math.ts";
import { toTuple3 } from "./utilities.ts";

export function fitBoxTransform(matrix: THREE.Matrix4, node: MapNode): MapNode {
  const vectors = [0, 1, 2].map((axis) =>
    new THREE.Vector3().setFromMatrixColumn(matrix, axis),
  );
  const position = fromVector3(
    new THREE.Vector3().setFromMatrixPosition(matrix),
  );
  let lengthAxis = node.scale.reduce(
    (longest, value, axis) =>
      Math.abs(value) > Math.abs(node.scale[longest]) ? axis : longest,
    0,
  );

  // A collapsed beam has no length direction; use a surviving dimension.
  if (vectors[lengthAxis].lengthSq() === 0) {
    lengthAxis = vectors.reduce(
      (longest, vector, axis) =>
        vector.lengthSq() > vectors[longest].lengthSq() ? axis : longest,
      0,
    );
  }
  if (vectors[lengthAxis].lengthSq() === 0)
    return { ...node, position, scale: [0, 0, 0] };

  const widthAxis = (lengthAxis + 1) % 3;
  const heightAxis = (lengthAxis + 2) % 3;
  const direction = vectors[lengthAxis].clone().normalize();
  const width = vectors[widthAxis]
    .clone()
    .addScaledVector(direction, -vectors[widthAxis].dot(direction));
  const height = vectors[heightAxis]
    .clone()
    .addScaledVector(direction, -vectors[heightAxis].dot(direction));
  const tolerance =
    Math.max(...vectors.map((vector) => vector.lengthSq())) * 1e-24;
  let across = width.clone();
  if (across.lengthSq() <= tolerance) across = height.clone().cross(direction);
  if (across.lengthSq() <= tolerance) {
    // Zero-width cross-sections still need a finite orthonormal frame.
    const axis = [0, 1, 2].reduce((least, candidate) =>
      Math.abs(direction.getComponent(candidate)) <
      Math.abs(direction.getComponent(least))
        ? candidate
        : least,
    );
    across.set(0, 0, 0).setComponent(axis, 1);
    across.addScaledVector(direction, -across.dot(direction));
  }
  across.normalize();
  const up = direction.clone().cross(across);
  const bx = width.dot(across);
  const by = width.dot(up);
  const cx = height.dot(across);
  const cy = height.dot(up);

  // This 2D least-squares fit minimizes corner displacement while keeping
  // the beam centerline fixed. Projected lengths balance missing/protruding ends.
  const angle =
    Math.atan2(2 * (bx * by - cx * cy), bx * bx + cy * cy - by * by - cx * cx) /
    2;
  across.multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle));
  up.crossVectors(direction, across);

  const basis = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  basis[lengthAxis] = direction;
  basis[widthAxis] = across;
  basis[heightAxis] = up;
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(basis[0], basis[1], basis[2]),
  );
  const scale = toTuple3(
    vectors.map((vector, axis) => Math.abs(vector.dot(basis[axis]))),
  );

  return { ...node, position, rotation: fromQuaternion(rotation), scale };
}
