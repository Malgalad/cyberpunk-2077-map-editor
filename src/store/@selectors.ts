import { createSelector } from "@reduxjs/toolkit";

import type {
  AppState,
  DistrictProperties,
  PersistentAppState,
} from "../types/types.ts";
import districtSlice from "./district.ts";
import nodesSlice from "./nodesV2.ts";
import optionsSlice from "./options.ts";
import projectSlice from "./project.ts";

export const getInitialState = createSelector(
  [
    districtSlice.getInitialState,
    nodesSlice.getInitialState,
    optionsSlice.getInitialState,
    projectSlice.getInitialState,
  ],
  (district, nodes, options, project) =>
    ({
      district,
      nodes,
      options,
      project,
    }) satisfies PersistentAppState as PersistentAppState,
);

export const getPersistentState = createSelector(
  [
    (state: AppState) => state.present[districtSlice.reducerPath],
    (state: AppState) => state.present[nodesSlice.reducerPath],
    (state: AppState) => state.present[optionsSlice.reducerPath],
    (state: AppState) => state.present[projectSlice.reducerPath],
  ],
  (district, nodes, options, project) =>
    ({
      district: {
        current: district.current,
        districts: district.districts.map((district) => {
          const { minMax, origin, ...rest } = district;

          return rest satisfies DistrictProperties;
        }),
      },
      nodes,
      options,
      project,
    }) satisfies PersistentAppState as PersistentAppState,
);
