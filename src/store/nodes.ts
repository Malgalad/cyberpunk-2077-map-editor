import { createSlice } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

import type {
  AppState,
  AppThunkAction,
  MapNode,
  NodesIndex,
  NodesMap,
  NodesTree,
  Optional,
} from "../types/types.ts";
import { immutableDistrictTransforms } from "../utilities/district.ts";
import { invalidateCachedTransforms } from "../utilities/getTransformsFromSubtree.ts";
import {
  buildSupportStructures,
  cloneNode,
  initNode,
  resolveParent,
  transplantNode,
} from "../utilities/nodes.ts";
import { transformToNode } from "../utilities/transforms.ts";
import { invariant } from "../utilities/utilities.ts";
import { hydrateState } from "./@actions.ts";
import { DistrictActions, DistrictSelectors } from "./district.ts";

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
    createNode: create.preparedReducer(
      (
        prepare: Optional<MapNode, "type" | "tag" | "district" | "position">,
      ) => {
        return { payload: initNode(prepare) };
      },
      (state, action) => {
        state.nodes[action.payload.id] = action.payload;
        Object.assign(state, buildSupportStructures(state.nodes));
        state.selected = [action.payload.id];
      },
    ),
    batchUpsertNodes: create.reducer<NodesMap>((state, action) => {
      Object.assign(state.nodes, action.payload);
      Object.assign(state, buildSupportStructures(state.nodes));
    }),
    updateNode: create.reducer<Optional<MapNode, "id">>((state, action) => {
      const current = state.nodes[action.payload.id];
      const previous = { ...current };
      const next = Object.assign(current, action.payload);

      if (
        previous.parent !== next.parent ||
        previous.district !== next.district ||
        previous.tag !== next.tag ||
        previous.pattern?.count !== next.pattern?.count
      ) {
        Object.assign(state, buildSupportStructures(state.nodes));
      }
    }),
    deleteNodesById: create.reducer<string[]>((state, action) => {
      for (const id of action.payload) {
        delete state.nodes[id];
      }
      state.selected = [];
      Object.assign(state, buildSupportStructures(state.nodes));
    }),
    selectNodes: create.reducer<string[]>((state, action) => {
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

const cloneNodeDeep =
  (
    id: string,
    nodeUpdates?: Partial<MapNode>,
    allNodesUpdates?: Partial<MapNode>,
  ): AppThunkAction<MapNode[]> =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = NodesSelectors.getNodes(state);
    const index = NodesSelectors.getNodesIndex(state);
    const node = nodes[id];
    const clones = cloneNode(nodes, index, node);
    const clonesMap: NodesMap = {};
    if (nodeUpdates) Object.assign(clones[0], nodeUpdates);
    for (const clone of clones) {
      if (allNodesUpdates) Object.assign(clone, allNodesUpdates);
      clonesMap[clone.id] = clone;
    }
    dispatch(NodesActions.batchUpsertNodes(clonesMap));
    return clones;
  };
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

    dispatch(nodesSlice.actions.deleteNodesById(nodeIds));
  };
const selectNode =
  (id: null | string, modifier?: "shift" | "ctrl" | "alt"): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = NodesSelectors.getNodes(state);
    const index = NodesSelectors.getNodesIndex(state);
    const selected = new Set(NodesSelectors.getSelectedNodes(state));

    if (id === null) {
      dispatch(nodesSlice.actions.selectNodes([]));
    } else if (!modifier) {
      dispatch(nodesSlice.actions.selectNodes([id]));
    } else if (modifier === "ctrl") {
      void (selected.has(id) ? selected.delete(id) : selected.add(id));
      dispatch(nodesSlice.actions.selectNodes([...selected]));
    } else if (modifier === "shift") {
      if (!selected.size) {
        dispatch(nodesSlice.actions.selectNodes([id]));
      } else {
        const startId = [...selected][0];
        const start = nodes[startId];
        const end = nodes[id];

        if (start.parent !== end.parent) return;

        const parentTree = start.parent
          ? index[start.parent].treeNode
          : index[start.district].treeNode;
        const siblings =
          parentTree.type === "rootByTag"
            ? parentTree[start.tag]
            : parentTree.children;
        const startIndex = siblings.findIndex((leaf) => leaf.id === startId);
        const endIndex = siblings.findIndex((leaf) => leaf.id === id);

        const set = new Set(
          siblings
            .slice(
              Math.min(startIndex, endIndex),
              Math.max(startIndex, endIndex) + 1,
            )
            .map((leaf) => leaf.id),
        );
        dispatch(nodesSlice.actions.selectNodes([...set]));
      }
    }
  };
const addDistrictNode =
  (index: number, tag: Exclude<MapNode["tag"], "create">): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();

    const district = DistrictSelectors.getDistrict(state);
    invariant(district, "Unexpected error: district is not defined");

    const transform = immutableDistrictTransforms.get(district.name)?.[index];
    invariant(
      transform,
      "Unexpected error: unable to find transform in district by index",
    );

    const selected = NodesSelectors.getSelectedNodes(state);
    const nodes = NodesSelectors.getNodes(state);
    const nodesIndex = NodesSelectors.getNodesIndex(state);
    const tree = NodesSelectors.getNodesTree(state);

    const parent = resolveParent(nodes[selected[0]]);
    const id = nanoid();

    // If the user clicks twice without moving the pointer, the highlighted block
    // will stay the same and trigger the event twice
    const districtTree = tree[district.name];
    invariant(
      districtTree?.type === "rootByTag",
      "Unexpected error: district tree not found",
    );

    const existingNode = districtTree[tag].find(
      (treeNode) => nodes[treeNode.id].indexInDistrict === index,
    );
    if (existingNode) return;

    const node = transformToNode(transform, district, {
      label: `Block #${index}`,
      parent: null,
      district: district.name,
      tag,
      id,
      indexInDistrict: index,
    });

    if (parent) {
      const nodeWithCorrectParent = transplantNode(
        nodes,
        node,
        parent,
        district.name,
      );
      invalidateCachedTransforms(nodes, nodesIndex, [parent]);
      dispatch(NodesActions.createNode(nodeWithCorrectParent));
    } else {
      dispatch(NodesActions.createNode(node));
    }
    dispatch(NodesActions.selectNode(id));
  };

const getSlice = (state: AppState) => state.present[nodesSlice.reducerPath];
export const NodesActions = {
  ...nodesSlice.actions,
  addDistrictNode,
  cloneNodeDeep,
  deleteNodesDeep,
  selectNode,
};
export const NodesSelectors = {
  getNodes: (state: AppState) => getSlice(state).nodes,
  getNodesTree: (state: AppState) => getSlice(state).tree,
  getNodesIndex: (state: AppState) => getSlice(state).index,
  getSelectedNodes: (state: AppState) => getSlice(state).selected,
};
export default nodesSlice;
