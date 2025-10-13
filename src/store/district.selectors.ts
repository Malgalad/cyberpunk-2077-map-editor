import { createSelector } from "@reduxjs/toolkit";

import { decodeImageData } from "../map3d/processDDS.ts";
import type { InstancedMeshTransforms } from "../types.ts";
import districtSlice from "./district.ts";
import nodesSlice from "./nodes.ts";

const hideExcludedIndexes =
  (excludedIndexes: number[]) =>
  (instance: InstancedMeshTransforms, index: number): InstancedMeshTransforms =>
    excludedIndexes.includes(index)
      ? {
          ...instance,
          hidden: true,
        }
      : instance;

const noTransforms: InstancedMeshTransforms[] = [];

export const getDistrictInstancedMeshTransforms = createSelector(
  [districtSlice.selectors.getDistrict, nodesSlice.selectors.getRemovals],
  (district, excludedIndexes): InstancedMeshTransforms[] => {
    if (district?.isCustom || !district?.imageData) return noTransforms;

    const transforms = decodeImageData(new Uint16Array(district.imageData));

    return transforms.map(hideExcludedIndexes(excludedIndexes));
  },
);
