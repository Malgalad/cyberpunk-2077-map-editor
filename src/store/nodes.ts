import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { WritableDraft } from "immer";
import { nanoid } from "nanoid";

import { MAX_DEPTH } from "../constants.ts";
import type { GroupNodeCache, MapNode, PersistentAppState } from "../types.ts";
import { cloneNode } from "../utilities.ts";
import { hydrateState } from "./@actions.ts";

interface NodesState {
  nodes: MapNode[];
  removals: number[];
  editingId: MapNode["id"] | undefined;
}

type AddNodeParams = {
  type: MapNode["type"];
  parent: string;
  position: [string, string, string];
};

const initialState: NodesState = {
  nodes: [],
  removals: [],
  editingId: undefined,
};

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
    insertNode: create.reducer((state, action: PayloadAction<MapNode>) => {
      state.nodes.push(action.payload);
    }),
    cloneNode: create.reducer((state, action: PayloadAction<MapNode["id"]>) => {
      const node = state.nodes.find((node) => node.id === action.payload);
      if (!node) return;
      const clones = cloneNode(state.nodes, node, node.parent);
      state.nodes.push(...clones);
      state.editingId = clones[0].id;
    }),
    patchNode: create.reducer(
      (
        state,
        action: PayloadAction<(draft: WritableDraft<MapNode>) => void>,
      ) => {
        const node = state.nodes.find((node) => node.id === state.editingId);
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
      (state, action: PayloadAction<MapNode["id"] | undefined>) => {
        state.editingId = action.payload;
      },
    ),
    setNodes: create.reducer((state, action: PayloadAction<MapNode[]>) => {
      state.nodes = action.payload;
    }),
    excludeTransform: create.reducer((state, action: PayloadAction<number>) => {
      state.removals.push(action.payload);
    }),
    includeTransform: create.reducer((state, action: PayloadAction<number>) => {
      state.removals = state.removals.filter((n) => n !== action.payload);
    }),
    setRemovals: create.reducer((state, action: PayloadAction<number[]>) => {
      state.removals = action.payload;
    }),
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState,
      (_, action: PayloadAction<PersistentAppState>) => action.payload.nodes,
    ),
  selectors: {
    getNodes: (state) => state.nodes,
    getEditingId: (state) => state.editingId,
    getRemovals: createSelector(
      [(sliceState: NodesState) => sliceState.removals],
      (removals) => removals.toSorted(),
    ),
    getChildNodesCache: createSelector(
      [
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      (nodes) => {
        const cache: GroupNodeCache = {};

        for (const node of nodes) {
          const parent = cache[node.parent] ?? { i: [], g: [], l: 0 };

          if (node.type === "instance") {
            parent.i.push(node.id);
          } else {
            let depth = 0;
            let current: MapNode | undefined = node;
            while (current) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              current = nodes.find((n) => n.id === current!.parent);
              depth += 1;
            }

            const self = cache[node.id] ?? { i: [], g: [], l: 0 };
            self.l = depth;
            // push reference to the array of own children ids
            parent.g.push(node.id, self.g);
            parent.i.push(self.i);
            cache[node.id] = self;
          }

          cache[node.parent] = parent;
        }

        for (const entry of Object.values(cache)) {
          entry.g = entry.g.flat(MAX_DEPTH);
          entry.i = entry.i.flat(MAX_DEPTH);
        }

        return cache;
      },
    ),
    getEditing: createSelector(
      [
        (sliceState: NodesState): string | undefined =>
          nodesSlice.getSelectors().getEditingId(sliceState),
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      (editing, nodes) => nodes.find((node) => node.id === editing),
    ),
  },
});

export const NodesActions = nodesSlice.actions;
export const NodesSelectors = nodesSlice.selectors;
export default nodesSlice;
