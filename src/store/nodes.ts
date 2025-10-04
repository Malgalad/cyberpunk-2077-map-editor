import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { WritableDraft } from "immer";
import { nanoid } from "nanoid";

import type { MapNode } from "../types.ts";
import { cloneNode } from "../utilities.ts";

interface NodesState {
  nodes: MapNode[];
  editing: MapNode["id"] | null;
}

type AddNodeParams = {
  type: MapNode["type"];
  parent: string;
  position: [string, string, string];
};

const initialState = {
  nodes: [],
  editing: null,
} satisfies NodesState as NodesState;

const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: (create) => ({
    addNode: create.preparedReducer(
      ({ type, parent, position }: AddNodeParams) => {
        const id = nanoid(8);
        const scale = type === "instance" ? "100" : "1";
        const node: MapNode = {
          id,
          label: `${type === "instance" ? "Box" : "Group"}`,
          type,
          parent,
          position,
          rotation: ["0", "0", "0"],
          scale: [scale, scale, scale],
        };

        return { payload: node };
      },
      (state, action: PayloadAction<MapNode>) => {
        state.nodes.push(action.payload);
      },
    ),
    cloneNode: create.reducer((state, action: PayloadAction<MapNode["id"]>) => {
      const node = state.nodes.find((node) => node.id === action.payload);
      if (!node) return;
      const clones = cloneNode(state.nodes, node, node.parent);
      state.nodes.push(...clones);
      state.editing = clones[0].id;
    }),
    patchNode: create.reducer(
      (
        state,
        action: PayloadAction<(draft: WritableDraft<MapNode>) => void>,
      ) => {
        const node = state.nodes.find((node) => node.id === state.editing);

        if (!node) return;

        action.payload(node);
      },
    ),
    deleteNode: create.reducer(
      (state, action: PayloadAction<MapNode["id"]>) => {
        state.nodes = state.nodes.filter((node) => node.id !== action.payload);
      },
    ),
    setEditing: create.reducer(
      (state, action: PayloadAction<MapNode["id"] | null>) => {
        state.editing = action.payload;
      },
    ),
    setNodes: create.reducer((state, action: PayloadAction<MapNode[]>) => {
      state.nodes = action.payload;
    }),
  }),
  selectors: {
    getNodes(state): MapNode[] {
      return state.nodes;
    },
    getChildNodesCache: createSelector(
      [(sliceState: NodesState) => sliceState.nodes],
      (nodes) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cache: Record<string, { i: any[]; g: string[] }> = {};

        for (const node of nodes) {
          const group = cache[node.parent] ?? { i: [], g: [] };

          if (node.type === "instance") {
            group.i.push(node.id);
          } else {
            const self = cache[node.id] ?? { i: [], g: [] };
            group.g.push(node.id);
            group.i.push(self.i);
            cache[node.id] = self;
          }

          cache[node.parent] = group;
        }

        return cache;
      },
    ),
    getEditing: createSelector(
      [
        (sliceState: NodesState) => sliceState.editing,
        (sliceState: NodesState) => sliceState.nodes,
      ],
      (editing, nodes) => nodes.find((node) => node.id === editing),
    ),
  },
});

export const NodesActions = nodesSlice.actions;
export const NodesSelectors = nodesSlice.selectors;
export default nodesSlice;
