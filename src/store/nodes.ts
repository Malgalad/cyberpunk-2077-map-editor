import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { produce, type WritableDraft } from "immer";
import { nanoid } from "nanoid";

import { MAX_DEPTH } from "../constants.ts";
import type { NodesState } from "../types/schemas.ts";
import type {
  AppThunkAction,
  GroupNodeCache,
  MapNode,
  RevivedAppState,
} from "../types/types.ts";
import { cloneNode } from "../utilities/nodes.ts";
import { hydrateState } from "./@actions.ts";

const initialState: NodesState = {
  nodes: [],
  editingId: null,
};

const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: (create) => ({
    addNode: create.preparedReducer(
      (
        init: Partial<MapNode> &
          Pick<MapNode, "type" | "tag" | "parent" | "position">,
      ) => {
        const {
          id = nanoid(8),
          label = init.type === "instance" ? "Box" : "Group",
          type,
          tag,
          parent,
          position,
          rotation = ["0", "0", "0"],
          scale = Array.from({ length: 3 }, () =>
            type === "instance" ? "100" : "1",
          ) as [string, string, string],
        } = init;
        const node: MapNode = {
          id,
          label,
          type,
          tag,
          parent,
          position,
          rotation,
          scale,
        };

        return { payload: node };
      },
      (state, action: PayloadAction<MapNode>) => {
        state.nodes.push(action.payload);
      },
    ),
    replaceNodes: create.reducer((state, action: PayloadAction<MapNode[]>) => {
      state.nodes = action.payload;
    }),
    cloneNode: create.reducer((state, action: PayloadAction<MapNode["id"]>) => {
      const node = state.nodes.find((node) => node.id === action.payload);
      if (!node) return;
      const clones = cloneNode(state.nodes, node, node.parent);
      state.nodes.push(...clones);
      state.editingId = clones[0].id;
    }),
    editNode: create.reducer((state, action: PayloadAction<MapNode>) => {
      const index = state.nodes.findIndex(
        (node) => node.id === action.payload.id,
      );
      state.nodes.splice(index, 1, action.payload);
    }),
    deleteNode: create.reducer(
      (state, action: PayloadAction<MapNode["id"]>) => {
        state.nodes = state.nodes.filter((node) => node.id !== action.payload);
      },
    ),
    setEditing: create.reducer(
      (state, action: PayloadAction<MapNode["id"] | null>) => {
        state.editingId = action.payload;
      },
    ),
  }),
  extraReducers: (builder) =>
    builder.addCase(
      hydrateState.fulfilled,
      (_, action: PayloadAction<RevivedAppState>) => action.payload.nodes,
    ),
  selectors: {
    getNodes: (state) => state.nodes,
    getEditingId: (state) => state.editingId,
    // TODO recalculate only changed parts of cache
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
        (sliceState: NodesState): string | null =>
          nodesSlice.getSelectors().getEditingId(sliceState),
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      (editing, nodes) => nodes.find((node) => node.id === editing),
    ),
  },
});

const patchNode =
  (callback: (draft: WritableDraft<MapNode>) => void): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = nodesSlice.selectors.getNodes(state);
    const editingId = nodesSlice.selectors.getEditingId(state);
    const node = nodes.find((node) => node.id === editingId);

    if (!node) return;

    const update = produce(node, callback);

    dispatch(nodesSlice.actions.editNode(update));
  };

export const NodesActions = {
  ...nodesSlice.actions,
  patchNode,
};
export const NodesSelectors = nodesSlice.selectors;
export default nodesSlice;
