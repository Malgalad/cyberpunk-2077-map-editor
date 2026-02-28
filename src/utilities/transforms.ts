import * as THREE from "three";

import { STATIC_ASSETS } from "../map3d/constants.ts";
import { decodeImageData } from "../map3d/processDDS.ts";
import type {
  District,
  DistrictProperties,
  InstancedMeshTransforms,
  MapNodeV2,
} from "../types/types.ts";
import { fs } from "./opfs.ts";
import { toTuple3 } from "./utilities.ts";

export async function fetchDistrictTransforms(district: DistrictProperties) {
  if (district.isCustom) {
    if (!district.texture) return [];

    const file = await fs.readFile("/textures/" + district.texture, "binary");
    return decodeImageData(new Uint16Array(file.buffer));
  }

  const arrayBuffer = await fetch(
    `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
  ).then((res) => res.arrayBuffer());

  return decodeImageData(new Uint16Array(arrayBuffer));
}

export function transformToNode(
  transform: InstancedMeshTransforms,
  district: District,
  properties: Pick<
    MapNodeV2,
    "label" | "parent" | "district" | "tag" | "id" | "indexInDistrict"
  >,
): MapNodeV2 {
  const position = toTuple3([
    transform.position.x + district.origin.x,
    transform.position.y + district.origin.y,
    transform.position.z + district.origin.z,
  ]);
  const rotation = toTuple3(
    new THREE.Euler()
      .setFromQuaternion(
        new THREE.Quaternion(
          transform.orientation.x,
          transform.orientation.y,
          transform.orientation.z,
          transform.orientation.w,
        ),
      )
      .toArray() as number[],
  );
  const scale = toTuple3([
    transform.scale.x,
    transform.scale.y,
    transform.scale.z,
  ]);
  const mirror = null;

  return {
    ...properties,
    type: "instance",
    hidden: false,
    position,
    rotation,
    scale,
    mirror,
  } satisfies MapNodeV2 as MapNodeV2;
}

export const unclampTransform =
  (district: District) => (transform: InstancedMeshTransforms) => {
    const { cubeSize, minMax } = district;

    const position = {
      x: transform.position.x * minMax.x,
      y: transform.position.y * minMax.y,
      z: transform.position.z * minMax.z,
      w: 1,
    };
    const scale = {
      x: transform.scale.x * cubeSize * 2,
      y: transform.scale.y * cubeSize * 2,
      z: transform.scale.z * cubeSize * 2,
      w: 1,
    };

    return {
      ...transform,
      position,
      scale,
    };
  };

export const clampTransforms =
  (district: District) => (transform: InstancedMeshTransforms) => {
    const { cubeSize, minMax } = district;

    const position = {
      x: transform.position.x / minMax.x,
      y: transform.position.y / minMax.y,
      z: transform.position.z / minMax.z,
      w: 1,
    };
    const scale = {
      x: transform.scale.x / cubeSize / 2,
      y: transform.scale.y / cubeSize / 2,
      z: transform.scale.z / cubeSize / 2,
      w: 1,
    };

    return {
      ...transform,
      position,
      scale,
    };
  };
