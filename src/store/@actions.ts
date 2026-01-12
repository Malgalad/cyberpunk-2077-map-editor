import { createAsyncThunk } from "@reduxjs/toolkit";

import type {
  District,
  DistrictProperties,
  InstancedMeshTransforms,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import {
  computeDistrictProperties,
  immutableDistrictTransforms,
} from "../utilities/district.ts";
import { getDistrictTransforms } from "../utilities/transforms.ts";

const unclampTransform =
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

const resolveDistrict = async (
  districtProperties: DistrictProperties,
): Promise<District> => {
  const transforms = await getDistrictTransforms(districtProperties);
  const computedProperties = computeDistrictProperties(
    districtProperties,
    transforms.length,
  );
  const district: District = {
    ...districtProperties,
    ...computedProperties,
  };
  const unclampedTransforms = transforms.map(unclampTransform(district));

  immutableDistrictTransforms.set(district.name, unclampedTransforms);

  return district;
};

export const hydrateStateActionPrefix = "hydrateState";
export const hydrateState = createAsyncThunk(
  hydrateStateActionPrefix,
  async (persistentState: PersistentAppState) => {
    const { districts, current } = persistentState.district;
    const resolvedDistricts = await Promise.all(districts.map(resolveDistrict));

    return {
      district: {
        districts: resolvedDistricts,
        current,
      },
      nodes: persistentState.nodes,
      options: persistentState.options,
      project: persistentState.project,
    } satisfies RevivedAppState as RevivedAppState;
  },
);
