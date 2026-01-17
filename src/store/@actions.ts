import { createAsyncThunk } from "@reduxjs/toolkit";

import type {
  District,
  DistrictProperties,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import {
  computeDistrictProperties,
  immutableDistrictTransforms,
} from "../utilities/district.ts";
import {
  fetchDistrictTransforms,
  unclampTransform,
} from "../utilities/transforms.ts";

const resolveDistrict = async (
  districtProperties: DistrictProperties,
): Promise<District> => {
  const transforms = await fetchDistrictTransforms(districtProperties);
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
