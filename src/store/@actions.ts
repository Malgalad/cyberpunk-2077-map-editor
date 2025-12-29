import { createAsyncThunk } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

import { TEMPLATE_ID } from "../constants.ts";
import type {
  District,
  MapNode,
  MapNodeParsed,
  PersistentAppState,
  RevivedAppState,
} from "../types/types.ts";
import {
  computeDistrictProperties,
  immutableDistrictTransforms,
} from "../utilities/district.ts";
import {
  getNodeDistrict,
  normalizeNodes,
  parseNode,
  validateNode,
} from "../utilities/nodes.ts";
import { getDistrictTransforms } from "../utilities/transforms.ts";
import { invariant, toNumber } from "../utilities/utilities.ts";

export const hydrateState = createAsyncThunk(
  "hydrateState",
  async (persistentState: PersistentAppState) => {
    const { districts } = persistentState.district;
    const { nodes } = persistentState.nodes;
    const resolvedDistricts: District[] = await Promise.all(
      districts.map((district) =>
        getDistrictTransforms(district).then((transforms) => {
          immutableDistrictTransforms.set(district.name, transforms);

          return {
            ...district,
            ...computeDistrictProperties(district, transforms.length),
          };
        }),
      ),
    );
    const updatedNodes = nodes.map((node) => {
      if (node.tag === "create" || node.type === "group" || node.index != null)
        return node;

      const id = nanoid();
      const index = toNumber(node.id);

      return {
        ...node,
        id,
        index,
      };
    });
    const map = new Map<string, MapNodeParsed>(
      updatedNodes.map((node) => [node.id, parseNode(node)]),
    );
    const validatedNodes: MapNode[] = normalizeNodes(updatedNodes)
      .map((node) => {
        if (node.district) return node;

        const district = getNodeDistrict(map, node);

        return {
          ...node,
          district,
        };
      })
      .map((node) => {
        if (node.district === TEMPLATE_ID) return node;

        const district = resolvedDistricts.find(
          (district) => district.name === node.district,
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
