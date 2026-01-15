import { createSlice } from "@reduxjs/toolkit";

import type {
  AppState,
  AppThunkAction,
  MapNodeV2,
  NodesIndex,
  NodesMap,
  NodesTree,
  Optional,
} from "../types/types.ts";
import {
  buildSupportStructures,
  cloneNode,
  initNode,
} from "../utilities/nodes.ts";
import { hydrateState } from "./@actions.ts";
import { DistrictActions } from "./district.ts";

interface NodesState {
  nodes: NodesMap;
  tree: NodesTree;
  index: NodesIndex;
  selected: string[];
}

const initialState: NodesState = {
  nodes: {},
  tree: {},
  index: {},
  selected: [],
};

const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: (create) => ({
    addNode: create.preparedReducer(
      (
        prepare: Optional<MapNodeV2, "type" | "tag" | "district" | "position">,
      ) => {
        return { payload: initNode(prepare) };
      },
      (state, action) => {
        state.nodes[action.payload.id] = action.payload;
        Object.assign(state, buildSupportStructures(state.nodes));
        state.selected = [action.payload.id];
      },
    ),
    batchAddNodes: create.reducer<NodesMap>((state, action) => {
      Object.assign(state.nodes, action.payload);
      Object.assign(state, buildSupportStructures(state.nodes));
    }),
    cloneNode: create.reducer<{
      id: string;
      selectAfterClone?: boolean;
      updates?: Partial<MapNodeV2>;
      globalUpdates?: Partial<MapNodeV2>;
    }>((state, action) => {
      const {
        id,
        selectAfterClone = true,
        updates,
        globalUpdates,
      } = action.payload;
      const node = state.nodes[id];
      const clones = cloneNode(state.nodes, state.index, node);
      if (updates) Object.assign(clones[0], updates);
      for (const clone of clones) {
        if (globalUpdates) Object.assign(clone, globalUpdates);
        state.nodes[clone.id] = clone;
      }
      Object.assign(state, buildSupportStructures(state.nodes));
      if (selectAfterClone) state.selected = [clones[0].id];
    }),
    editNode: create.reducer<Optional<MapNodeV2, "id">>((state, action) => {
      const update = action.payload;
      const current = state.nodes[update.id];

      Object.assign(state.nodes[update.id], update);

      if (
        current.parent !== update.parent ||
        current.district !== update.district ||
        current.tag !== update.tag
      ) {
        Object.assign(state, buildSupportStructures(state.nodes));
      }
    }),
    editNodes: create.reducer<Optional<MapNodeV2, "id">[]>((state, action) => {
      let shouldRebuildSupport = false;
      for (const update of action.payload) {
        const current = state.nodes[update.id];
        const parentChanged = update.parent !== current.parent;
        const districtChanged = update.district !== current.district;
        const tagChanged = update.tag !== current.tag;
        shouldRebuildSupport =
          shouldRebuildSupport ||
          parentChanged ||
          districtChanged ||
          tagChanged;
        Object.assign(state.nodes[update.id], update);
      }
      if (shouldRebuildSupport) {
        Object.assign(state, buildSupportStructures(state.nodes));
      }
    }),
    deleteNodes: create.reducer<string[]>((state, action) => {
      for (const id of action.payload) {
        delete state.nodes[id];
      }
      state.selected = [];
      Object.assign(state, buildSupportStructures(state.nodes));
    }),
    selectNode: create.reducer<null | {
      id: string;
      modifier?: "shift" | "ctrl" | "alt";
    }>((state, action) => {
      if (action.payload == null) {
        state.selected = [];
        return;
      }

      const { id, modifier } = action.payload;
      const set = new Set<string>(state.selected || []);
      if (!modifier) {
        state.selected = [id];
      } else if (modifier === "ctrl") {
        void (set.has(id) ? set.delete(id) : set.add(id));
        state.selected = [...set.values()];
      } else if (modifier === "shift") {
        if (!set.size) {
          state.selected = [id];
        } else {
          const startId = [...set.values()].at(0)!;
          const start = state.nodes[startId];
          const end = state.nodes[id];

          if (start.parent !== end.parent) return;

          const parentTree = start.parent
            ? state.index[start.parent].treeNode
            : state.index[start.district].treeNode;
          const siblings =
            parentTree.type === "district"
              ? parentTree[start.tag]
              : parentTree.children;
          const startIndex = siblings.findIndex((leaf) => leaf.id === startId);
          const endIndex = siblings.findIndex((leaf) => leaf.id === id);

          state.selected = siblings
            .slice(
              Math.min(startIndex, endIndex),
              Math.max(startIndex, endIndex) + 1,
            )
            .map((leaf) => leaf.id);
        }
      }
    }),
    selectNodes: create.reducer<NodesState["selected"]>((state, action) => {
      state.selected = action.payload;
    }),
  }),
  extraReducers: (builder) =>
    builder
      .addCase(hydrateState.fulfilled, (state, action) => {
        const { nodes, selected } = action.payload.nodes;
        state.nodes = nodes;
        state.selected = selected;
        Object.assign(state, buildSupportStructures(state.nodes));
      })
      .addCase(DistrictActions.updateDistrict, (state, action) => {
        const { name: currentName, district: update } = action.payload;
        if (currentName === update.name) return;

        const root = state.index[currentName];

        for (const id of root.descendantIds) {
          state.nodes[id].district = update.name;
        }

        Object.assign(state, buildSupportStructures(state.nodes));
      }),
});

const deleteNodesDeep =
  (selected: string[]): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = NodesSelectors.getNodes(state);
    const index = NodesSelectors.getNodesIndex(state);
    const nodeIds: string[] = [];

    for (const id of selected) {
      nodeIds.push(id);

      if (nodes[id].type === "instance") continue;

      nodeIds.push(...index[id].descendantIds);
    }

    dispatch(nodesSlice.actions.deleteNodes(nodeIds));
  };

const getSlice = (state: AppState) => state.present[nodesSlice.reducerPath];
export const NodesActions = {
  ...nodesSlice.actions,
  deleteNodesDeep,
};
export const NodesSelectors = {
  getNodes: (state: AppState) => getSlice(state).nodes,
  getNodesTree: (state: AppState) => getSlice(state).tree,
  getNodesIndex: (state: AppState) => getSlice(state).index,
  getSelectedNodes: (state: AppState) => getSlice(state).selected,
};
export default nodesSlice;
