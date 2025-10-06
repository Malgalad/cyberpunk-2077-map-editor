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
          scale: { x: 0, y: 0, z: 0, w: 0 },
        }
      : instance;

const noTransforms: InstancedMeshTransforms[] = [];

export const getDistrictInstancedMeshTransforms = createSelector(
  [districtSlice.selectors.getDistrictData, nodesSlice.selectors.getRemovals],
  (districtData, excludedIndexes): InstancedMeshTransforms[] => {
    if (!districtData) return noTransforms;

    const transforms = decodeImageData(new Uint16Array(districtData.imageData));

    return transforms.map(hideExcludedIndexes(excludedIndexes));
  },
);
