import * as THREE from "three";

import type { Tuple3 } from "../types/types.ts";
import { toTuple3 } from "./utilities.ts";

export const toVector3 = (tuple: Tuple3<number>) =>
  new THREE.Vector3().fromArray(tuple);
export const fromVector3 = (vector: THREE.Vector3) =>
  toTuple3(vector.toArray());

export const toQuaternion = (rotation: THREE.Vector3Tuple | THREE.EulerTuple) =>
  new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(rotation));
export const fromQuaternion = (quaternion: THREE.Quaternion) =>
  toTuple3(
    new THREE.Euler().setFromQuaternion(quaternion).toArray() as number[],
  );
