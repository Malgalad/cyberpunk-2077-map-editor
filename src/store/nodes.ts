import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { produce, type WritableDraft } from "immer";
import { nanoid } from "nanoid";

import { MAX_DEPTH, TEMPLATE_ID } from "../constants.ts";
import type {
  AppThunkAction,
  District,
  GroupNodeCache,
  IntermediateGroupNodeCache,
  MapNode,
  MapNodeUri,
  RevivedAppState,
} from "../types/types.ts";
import {
  cloneNode,
  normalizeNodes,
  parseNode,
  validateNode,
} from "../utilities/nodes.ts";
import { structuralSharing } from "../utilities/structuralSharing.ts";
import { hydrateState } from "./@actions.ts";
import { DistrictActions, DistrictSelectors } from "./district.ts";

interface NodesState {
  nodes: MapNode[];
  editingId: string | null;
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
    cloneNode: create.reducer(
      (
        state,
        action: PayloadAction<{
          id: MapNode["id"];
          selectAfterClone?: boolean;
          updates?: Partial<MapNode>;
        }>,
      ) => {
        const { id, selectAfterClone = true, updates } = action.payload;
        const node = state.nodes.find((node) => node.id === id);
        if (!node) return;
        const clones = cloneNode(state.nodes, node, node.parent);
        Object.assign(clones[0], updates);
        state.nodes.push(...clones);
        if (selectAfterClone) state.editingId = clones[0].id;
      },
    ),
    editNode: create.reducer((state, action: PayloadAction<MapNode>) => {
      const next = action.payload;
      const index = state.nodes.findIndex((node) => node.id === next.id);
      const previous = state.nodes[index];

      state.nodes.splice(index, 1, next);

      if (previous.parent !== next.parent) {
        const map = new Map(state.nodes.map((node) => [node.id, node]));
        state.nodes = normalizeNodes(state.nodes, map);
      }
    }),
    deleteNodes: create.reducer(
      (state, action: PayloadAction<MapNode["id"][]>) => {
        state.nodes = state.nodes.filter(
          (node) => !action.payload.includes(node.id),
        );
      },
    ),
    selectNode: create.reducer(
      (state, action: PayloadAction<MapNode["id"] | null>) => {
        state.editingId = action.payload;
      },
    ),
  }),
  extraReducers: (builder) =>
    builder
      .addCase(
        hydrateState.fulfilled,
        (_, action: PayloadAction<RevivedAppState>) => action.payload.nodes,
      )
      .addCase(
        DistrictActions.updateDistrict,
        (
          state,
          action: PayloadAction<{ name: string; district: District }>,
        ) => {
          const { name, district } = action.payload;
          if (name === district.name) return;

          for (const node of state.nodes) {
            if (node.parent === name) {
              node.parent = district.name;
            }
          }
        },
      ),
  selectors: {
    getNodes: (state) => state.nodes,
    getSelectedNodeId: (state) => state.editingId,
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
      structuralSharing((nodes: MapNodeUri[]) => {
        const cache: IntermediateGroupNodeCache = {};
        const nodesMap = new Map(nodes.map((node) => [node.id, node]));

        for (const node of nodes) {
          const parent = cache[node.parent] ?? createCacheEntry();

          if (node.type === "instance") {
            parent.instances.push(node.id);
            if (node.tag === "create") parent.additions.push(node.id);
            if (node.tag === "update") parent.updates.push(node.id);
            if (node.tag === "delete") parent.deletions.push(node.id);
            if (node.hasErrors) parent.errors.push(node.id);
          } else {
            let depth = 0;
            let current: MapNodeUri | undefined = node;
            while (current) {
              current = nodesMap.get(current!.parent);
              depth += 1;
            }

            const self = cache[node.id] ?? createCacheEntry();
            self.level = depth;
            // push reference to the array of own children ids to flatten later
            parent.groups.push(node.id, self.groups);
            parent.instances.push(self.instances);
            parent.errors.push(self.errors);

            if (node.tag === "create") parent.additions.push(self.additions);
            if (node.tag === "update") parent.updates.push(self.updates);
            if (node.tag === "delete") parent.deletions.push(self.deletions);
            if (node.hasErrors) parent.errors.push(node.id);

            cache[node.id] = self;
          }

          cache[node.parent] = parent;
        }

        // flatten NestedArray<string>[] to string[]
        for (const entry of Object.values(cache)) {
          entry.groups = entry.groups.flat(MAX_DEPTH);
          entry.instances = entry.instances.flat(MAX_DEPTH);
          entry.nodes = [...entry.groups, ...entry.instances];
          entry.additions = entry.additions.flat(MAX_DEPTH);
          entry.updates = entry.updates.flat(MAX_DEPTH);
          entry.deletions = entry.deletions.flat(MAX_DEPTH);
          entry.errors = entry.errors.flat(MAX_DEPTH);
        }

        return cache as GroupNodeCache;
      }),
    ),
    getSelectedNode: createSelector(
      [
        (sliceState: NodesState): string | null =>
          nodesSlice.getSelectors().getSelectedNodeId(sliceState),
        (sliceState: NodesState): MapNode[] =>
          nodesSlice.getSelectors().getNodes(sliceState),
      ],
      (editing, nodes) => nodes.find((node) => node.id === editing),
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
  (callback: (draft: WritableDraft<MapNode>) => void): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = nodesSlice.selectors.getNodes(state);
    const selectedNode = nodesSlice.selectors.getSelectedNode(state);
    const district = DistrictSelectors.getDistrict(state);
    const cache = nodesSlice.selectors.getChildNodesCache(state);
    const map = new Map(nodes.map((node) => [node.id, parseNode(node)]));

    if (!selectedNode || !district) return;

    const update = produce(selectedNode, callback);
    const validated = validateNode(update, map, district);

    dispatch(nodesSlice.actions.editNode(validated));

    if (selectedNode.type === "group") {
      const children = cache[selectedNode.id].nodes;

      for (const childId of children) {
        const child = nodes.find((node) => node.id === childId);
        const validated = validateNode(child!, map, district);

        if (validated !== child) {
          dispatch(nodesSlice.actions.editNode(validated));
        }
      }
    }
  };
const deleteNodeDeep =
  (id: MapNode["id"]): AppThunkAction =>
  (dispatch, getState) => {
    const state = getState();
    const nodes = nodesSlice.selectors.getNodes(state);
    const cache = nodesSlice.selectors.getChildNodesCache(state);
    const node = nodes.find((node) => node.id === id);

    if (!node) return;

    if (node.type === "instance") {
      dispatch(nodesSlice.actions.deleteNodes([id]));
    } else {
      dispatch(nodesSlice.actions.deleteNodes([id, ...cache[id].nodes]));
    }
  };

export const NodesActions = {
  ...nodesSlice.actions,
  patchNode,
  deleteNodeDeep,
};
export const NodesSelectors = nodesSlice.selectors;
export default nodesSlice;

const createCacheEntry = (): IntermediateGroupNodeCache[string] => ({
  instances: [],
  groups: [],
  nodes: [],
  additions: [],
  updates: [],
  deletions: [],
  errors: [],
  level: 0,
});
