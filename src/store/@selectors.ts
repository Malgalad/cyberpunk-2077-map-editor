import { createSelector } from "@reduxjs/toolkit";

import type {
  AppState,
  District,
  DistrictData,
  GroupNodeCache,
  MapNode,
  PersistentAppState,
} from "../types/types.ts";
import { structuralSharing } from "../utilities/structuralSharing.ts";
import { projectNodesToDistrict } from "../utilities/transforms.ts";
import districtSlice from "./district.ts";
import nodesSlice from "./nodes.ts";
import optionsSlice from "./options.ts";
import projectSlice from "./project.ts";

const emptyArray: MapNode[] = [];

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
      district: {
        current: district.current,
        districts: district.districts.map((district) => {
          const { transforms, minMax, origin, center, ...rest } = district;

          return rest satisfies DistrictData;
        }),
      },
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
  structuralSharing(
    (
      district: District | undefined,
      nodes: MapNode[],
      cache: GroupNodeCache,
    ) => {
      const cachedDistrict = cache[district?.name ?? "__NOT_SELECTED__"];

      if (!district || !cachedDistrict) return emptyArray;

      const districtNodeIds = new Set([
        ...cachedDistrict.i,
        ...cachedDistrict.g,
      ]);

      return nodes.filter((node) => districtNodeIds.has(node.id));
    },
  ),
);

export const getAdditions = createSelector([getDistrictNodes], (nodes) =>
  nodes.filter((node) => node.tag === "create"),
);

export const getUpdates = createSelector([getDistrictNodes], (nodes) =>
  nodes.filter((node) => node.tag === "update"),
);

export const getDeletions = createSelector([getDistrictNodes], (nodes) =>
  nodes.filter((node) => node.tag === "delete"),
);

export const getAdditionsTransforms = createSelector(
  [getAdditions, districtSlice.selectors.getDistrict, () => true],
  projectNodesToDistrict,
);

export const getUpdatesTransforms = createSelector(
  [getUpdates, districtSlice.selectors.getDistrict, () => false],
  projectNodesToDistrict,
);

export const getDeletionsTransforms = createSelector(
  [getDeletions, districtSlice.selectors.getDistrict, () => false],
  projectNodesToDistrict,
);
