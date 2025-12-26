import {
  createSelector,
  createSlice,
  prepareAutoBatched,
} from "@reduxjs/toolkit";
import { produce, type WritableDraft } from "immer";
import { nanoid } from "nanoid";

import { TEMPLATE_ID } from "../constants.ts";
import type { AppThunkAction, MapNode, MapNodeUri } from "../types/types.ts";
import {
  cloneNode,
  createGroupNodesCache,
  normalizeNodes,
  parseNode,
  validateNode,
} from "../utilities/nodes.ts";
import { structuralSharing } from "../utilities/structuralSharing.ts";
import { invariant } from "../utilities/utilities.ts";
import { hydrateState } from "./@actions.ts";
import { DistrictActions, DistrictSelectors } from "./district.ts";

interface NodesState {
  nodes: MapNode[];
  editingId: string | string[] | null;
}

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
          Pick<MapNode, "type" | "tag" | "parent" | "district" | "position">,
      ) => {
        const {
          id = nanoid(8),
          label = init.type === "instance" ? "Box" : "Group",
          type,
          tag,
          parent,
          district,
          position,
          rotation = ["0", "0", "0"],
          scale = type === "instance" ? ["100", "100", "100"] : ["1", "1", "1"],
        } = init;
        const node: MapNode = {
          id,
          label,
          type,
          tag,
          parent,
          district,
          position,
          rotation,
          scale,
        };

        return { payload: node };
      },
      (state, action) => {
        state.nodes.push(action.payload);
      },
    ),
    replaceNodes: create.reducer<MapNode[]>((state, action) => {
      state.nodes = action.payload;
    }),
    cloneNode: create.reducer<{
      id: MapNode["id"];
      selectAfterClone?: boolean;
      updates?: Partial<MapNode>;
      globalUpdates?: Partial<MapNode>;
    }>((state, action) => {
      const {
        id,
        selectAfterClone = true,
        updates,
        globalUpdates,
      } = action.payload;
      const node = state.nodes.find((node) => node.id === id);
      if (!node) return;
      const clones = cloneNode(state.nodes, node, node.parent);
      invariant(clones[0], "Unexpected error: clones[0] is undefined");
      Object.assign(clones[0], updates);
      if (globalUpdates)
        clones.forEach((clone) => Object.assign(clone, globalUpdates));
      state.nodes.push(...clones);
      if (selectAfterClone) state.editingId = clones[0].id;
    }),
    editNode: create.preparedReducer(
      prepareAutoBatched<MapNode>(),
      (state, action) => {
        const next = action.payload;
        const index = state.nodes.findIndex((node) => node.id === next.id);
        const previous = state.nodes[index];

        invariant(previous, "Unexpected error: could not find node by id");

        state.nodes.splice(index, 1, next);

        if (previous.parent !== next.parent) {
          state.nodes = normalizeNodes(state.nodes);
        }
      },
    ),
    deleteNodes: create.reducer<string[]>((state, action) => {
      state.nodes = state.nodes.filter(
        (node) => !action.payload.includes(node.id),
      );
    }),
    selectNode: create.reducer<null | {
      id: string;
      modifier?: "shift" | "ctrl" | "alt";
    }>((state, action) => {
      if (action.payload == null) {
        state.editingId = null;
        return;
      }

      const { id, modifier } = action.payload;
      const set = new Set<string>(
        state.editingId
          ? Array.isArray(state.editingId)
            ? state.editingId
            : [state.editingId]
          : [],
      );
      if (!modifier) {
        state.editingId = [id];
      } else if (modifier === "ctrl") {
        void (set.has(id) ? set.delete(id) : set.add(id));
        state.editingId = [...set.values()];
      } else if (modifier === "shift") {
        if (!set.size) {
          state.editingId = [id];
        } else {
          const startId = [...set.values()].at(0)!;
          const start = state.nodes.findIndex((node) => node.id === startId);
          const startNode = state.nodes[start];
          const end = state.nodes.findIndex((node) => node.id === id);
          const endNode = state.nodes[end];

          if (!startNode || !endNode) return;
          if (startNode.parent !== endNode.parent) return;
          if (startNode.tag !== endNode.tag) return;

          const interval = state.nodes
            .slice(Math.min(start, end), Math.max(start, end))
            .filter((node) => node.tag === startNode.tag);

          for (const node of interval) {
            if (node.parent === startNode.parent) {
              set.add(node.id);
            }
          }

          set.add(id);

          state.editingId = [...set.values()];
        }
      }
    }),
  }),
  extraReducers: (builder) =>
    builder
      .addCase(hydrateState.fulfilled, (_, action) => action.payload.nodes)
      .addCase(DistrictActions.updateDistrict, (state, action) => {
        const { name, district } = action.payload;
        if (name === district.name) return;

        for (const node of state.nodes) {
          if (node.parent === name) {
            node.parent = district.name;
          }
          if (node.district === name) {
            node.district = district.name;
          }
        }
      }),
  selectors: {
    getNodes: (state) => state.nodes,
    getSelectedNodeIds: structuralSharing((state): string[] => {
      const selected = state.editingId;
      if (selected == null) return [];
      if (Array.isArray(selected)) return selected;
      return [selected];
    }),
    getNodeUris: createSelector(
      [
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      structuralSharing((nodes: MapNode[]): MapNodeUri[] =>
        nodes.map(({ id, type, tag, parent, errors }) => ({
          id,
          type,
          tag,
          parent,
          hasErrors: !!errors,
        })),
      ),
    ),
    getChildNodesCache: createSelector(
      [
        (sliceState: NodesState): MapNodeUri[] =>
          nodesSlice.getSelectors().getNodeUris(sliceState),
      ],
      structuralSharing(createGroupNodesCache),
    ),
    getSelectedNodes: createSelector(
      [
        (sliceState: NodesState): string[] =>
          nodesSlice.getSelectors().getSelectedNodeIds(sliceState),
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      structuralSharing((selected: string[], nodes: MapNode[]): MapNode[] =>
        nodes.filter((node) => selected.includes(node.id)),
      ),
    ),
    getTemplateNodes: createSelector(
      [
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      structuralSharing((nodes: MapNode[]) =>
        nodes.filter((node) => node.parent === TEMPLATE_ID),
      ),
    ),
  },
});

const patchNode =
  (
    id: string,
    callback: (draft: WritableDraft<MapNode>) => void,
  ): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = nodesSlice.selectors.getNodes(state);
    const selectedNode = nodes.find((node) => node.id === id);
    const district = DistrictSelectors.getDistrict(state);
    const cache = nodesSlice.selectors.getChildNodesCache(state);
    const map = new Map(nodes.map((node) => [node.id, parseNode(node)]));

    if (!selectedNode || !district) return;

    const update = produce(selectedNode, callback);
    const validated = validateNode(update, map, district);

    dispatch(nodesSlice.actions.editNode(validated));

    if (selectedNode.type === "group") {
      const groupIndex = cache[selectedNode.id];
      invariant(groupIndex, "Unexpected error: groupIndex is undefined");
      const children = groupIndex.nodes;

      for (const childId of children) {
        const child = nodes.find((node) => node.id === childId);
        const validated = validateNode(child!, map, district);

        if (validated !== child) {
          dispatch(nodesSlice.actions.editNode(validated));
        }
      }
    }
  };
const deleteNodesDeep =
  (ids: MapNode["id"][]): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = nodesSlice.selectors.getNodes(state);
    const cache = nodesSlice.selectors.getChildNodesCache(state);
    const idsFull: string[] = [];

    for (const id of ids) {
      const node = nodes.find((node) => node.id === id);

      if (!node) continue;

      if (node.type === "instance") {
        idsFull.push(id);
      } else {
        const groupIndex = cache[id];
        invariant(groupIndex, "Unexpected error: groupIndex is undefined");
        idsFull.push(id, ...groupIndex.nodes);
      }
    }

    dispatch(nodesSlice.actions.deleteNodes(idsFull));
  };

export const NodesActions = {
  ...nodesSlice.actions,
  patchNode,
  deleteNodesDeep,
};
export const NodesSelectors = nodesSlice.selectors;
export default nodesSlice;
