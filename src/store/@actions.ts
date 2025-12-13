import { createAsyncThunk } from "@reduxjs/toolkit";

import { TEMPLATE_ID } from "../constants.ts";
import type {
  District,
  MapNode,
  MapNodeParsed,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import { computeDistrictProperties } from "../utilities/district.ts";
import { parseNode, validateNode } from "../utilities/nodes.ts";
import { getDistrictTransforms } from "../utilities/transforms.ts";
import { invariant } from "../utilities/utilities.ts";

export const hydrateState = createAsyncThunk(
  "hydrateState",
  async (persistentState: PersistentAppState) => {
    const { districts } = persistentState.district;
    const { nodes } = persistentState.nodes;
    const resolvedDistricts: District[] = await Promise.all(
      districts.map((district) =>
        getDistrictTransforms(district).then((transforms) => ({
          ...district,
          ...computeDistrictProperties(district),
          transforms,
        })),
      ),
    );
    const map = new Map<string, MapNodeParsed>(
      nodes.map((node) => [node.id, parseNode(node)]),
    );
    const validatedNodes: MapNode[] = nodes.map((node) => {
      let parent = node.parent;
      while (map.has(parent)) {
        parent = map.get(parent)!.parent;
      }

      if (parent === TEMPLATE_ID) return node;

      const district = resolvedDistricts.find(
        (district) => district.name === parent,
      );
      invariant(
        district,
        `Cannot find district "${parent} for node ${node.label} [${node.id}]"`,
      );
      return validateNode(node, map, district);
    });

    return {
      district: {
        districts: resolvedDistricts,
        current: persistentState.district.current,
      },
      nodes: {
        nodes: validatedNodes,
        editingId: persistentState.nodes.editingId,
      },
      options: persistentState.options,
      project: persistentState.project,
    } satisfies RevivedAppState as RevivedAppState;
  },
);
