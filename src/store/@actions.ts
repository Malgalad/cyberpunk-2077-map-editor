import { createAsyncThunk } from "@reduxjs/toolkit";

import { MARKER_ID } from "../constants.ts";
import type {
  District,
  DistrictProperties,
  MapNode,
  NodesMap,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import {
  computeDistrictProperties,
  immutableDistrictTransforms,
} from "../utilities/district.ts";
import { transplantNode } from "../utilities/nodes.ts";
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

const isMarker = (nodes: NodesMap, node: MapNode) =>
  node.type === "instance" &&
  nodes[node.parent || ""]?.label.toLowerCase() === "markers" &&
  Object.values(node.scale).every((v) => v === 1);

function migrateMarkers(nodes: NodesMap): NodesMap {
  const map: NodesMap = {};

  for (const [id, node] of Object.entries(nodes)) {
    if (isMarker(nodes, node) && node.district !== MARKER_ID) {
      map[id] = transplantNode(nodes, node, null, MARKER_ID);
    } else {
      map[id] = node;
    }
  }

  return map;
}

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
      nodes: {
        nodes: migrateMarkers(persistentState.nodes.nodes),
        selected: persistentState.nodes.selected,
      },
      options: {
        ...persistentState.options,
        effects: persistentState.options.effects ?? ["ao", "aa"],
      },
      project: persistentState.project,
    } satisfies RevivedAppState as RevivedAppState;
  },
);
