import { createSelector } from "@reduxjs/toolkit";

import type { AppState, MapNode, PersistentAppState } from "../types.ts";
import districtSlice from "./district.ts";
import nodesSlice from "./nodes.ts";
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
    (state: AppState) => state[districtSlice.reducerPath],
    (state: AppState) => state[nodesSlice.reducerPath],
    (state: AppState) => state[optionsSlice.reducerPath],
    (state: AppState) => state[projectSlice.reducerPath],
  ],
  (district, nodes, options, project) =>
    ({
      district,
      nodes,
      options,
      project,
    }) satisfies PersistentAppState as PersistentAppState,
);

export const getDistrictNodes = createSelector(
  [
    districtSlice.selectors.getDistrict,
    nodesSlice.selectors.getNodes,
    nodesSlice.selectors.getChildNodesCache,
  ],
  (district, nodes, cache) => {
    const cachedDistrict = cache[district?.name ?? "__NOT_SELECTED__"];

    if (!district || !cachedDistrict) return [] as MapNode[];

    const districtNodeIds = new Set([...cachedDistrict.i, ...cachedDistrict.g]);

    return nodes.filter((node) => districtNodeIds.has(node.id));
  },
);
