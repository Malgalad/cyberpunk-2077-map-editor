import * as React from "react";

import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import { ProjectActions } from "../store/project.ts";
import type {
  MapNodeV2,
  Modes,
  NodesIndex,
  NodesMap,
  Plane,
} from "../types/types.ts";
import {
  getTransformsFromSubtree,
  invalidateCachedTransforms,
} from "../utilities/getTransformsFromSubtree.ts";
import { lookAtTransform } from "../utilities/map.ts";
import {
  cloneNode,
  resolveParent,
  transplantPoint,
} from "../utilities/nodes.ts";
import { toTuple3 } from "../utilities/utilities.ts";
import { useAppDispatch, useAppSelector, useAppStore } from "./hooks.ts";

export function useFocusNodeOnSelected(node: MapNodeV2) {
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selected.at(-1) === node.id) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected, node]);

  return ref;
}

export function useLookAtNode(node: MapNodeV2) {
  const map3D = useMap3D();
  const store = useAppStore();

  return React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!map3D) return;

      event.preventDefault();
      const state = store.getState();
      const district = DistrictSelectors.getDistrict(state);
      if (!district) return;
      const nodes = NodesSelectors.getNodes(state);
      const tree = NodesSelectors.getNodesTree(state);
      const index = NodesSelectors.getNodesIndex(state);
      const districtTree = tree[district.name];
      if (!districtTree || districtTree.type !== "district") return;
      const transforms = getTransformsFromSubtree(
        district,
        nodes,
        districtTree[node.tag],
      );

      const transformId =
        node.type === "instance"
          ? node.id
          : index[node.id].descendantIds.find(
              (id) => nodes[id].type === "instance",
            );
      const transform = transforms.find(({ id }) => id === transformId);

      if (transform) {
        const [position, zoom] = lookAtTransform(transform, district);
        map3D.lookAt(position, zoom);
      }
    },
    [map3D, store, node],
  );
}

export function useSelectNode(node: MapNodeV2) {
  const dispatch = useAppDispatch();

  return React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const modifier = event.getModifierState("Control")
        ? "ctrl"
        : event.getModifierState("Shift")
          ? "shift"
          : undefined;
      dispatch(NodesActions.selectNode(node.id, modifier));
    },
    [node, dispatch],
  );
}

export function useDeselectNode() {
  const dispatch = useAppDispatch();

  return React.useCallback(
    () => void dispatch(NodesActions.selectNode(null)),
    [dispatch],
  );
}

export function useCloneNode(node?: MapNodeV2) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(() => {
    if (!node) return;
    if (node.parent) invalidate([node.parent]);
    const [clone] = dispatch(NodesActions.cloneNodeDeep(node.id));
    dispatch(NodesActions.selectNode(clone.id));
  }, [dispatch, node, invalidate]);
}

export function useChangeNodeTag(node?: MapNodeV2) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);

  return React.useCallback(
    (tag: MapNodeV2["tag"], mode: Modes = tag) => {
      if (!node) return;
      if (node.parent) invalidate([node.parent]);
      const updates: NodesMap = {
        [node.id]: { ...node, tag, parent: null },
      };
      if (node.type === "group") {
        for (const id of index[node.id].descendantIds) {
          updates[id] = { ...nodes[id], tag };
        }
      }
      dispatch(NodesActions.batchUpsertNodes(updates));
      dispatch(ProjectActions.setMode(mode));
    },
    [dispatch, node, invalidate, nodes, index],
  );
}

export function useDeleteNode(selected: string[]) {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(async () => {
    if (selected.length === 0) return;

    const message =
      selected.length > 1
        ? `Do you want to delete ${selected.length} nodes?`
        : `Do you want to delete node "${nodes[selected[0]].label}"?`;
    const confirmed = await dispatch(
      ModalsActions.openModal("confirm", message),
    );

    if (confirmed) {
      invalidate(selected);
      dispatch(NodesActions.deleteNodesDeep(selected));
    }
  }, [dispatch, selected, nodes, invalidate]);
}

export function useAddNode(type: MapNodeV2["type"], tag: MapNodeV2["tag"]) {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const invalidate = useInvalidateTransformsCache();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);
  const selectedDistrict = useAppSelector(DistrictSelectors.getDistrict);

  return React.useCallback(() => {
    if (selectedNodes.length > 1 || !selectedDistrict || !map3d) return;

    const parent = resolveParent(nodes[selectedNodes[0]]);
    const center = toTuple3(map3d.getCenter());
    const position = transplantPoint(nodes, center, parent);

    if (parent) invalidate([parent]);
    dispatch(
      NodesActions.createNode({
        type,
        tag,
        parent,
        district: selectedDistrict.name,
        position,
      }),
    );
  }, [
    dispatch,
    nodes,
    selectedNodes,
    selectedDistrict,
    map3d,
    tag,
    type,
    invalidate,
  ]);
}

export function useMirrorNode(node?: MapNodeV2) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(
    (plane: Plane) => {
      if (!node) return;

      invalidate([node.id]);
      dispatch(
        NodesActions.updateNode({
          id: node.id,
          mirror: node.mirror === plane ? null : plane,
        }),
      );
    },
    [dispatch, node, invalidate],
  );
}

export function useHideNode(selected: string[]) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();
  const nodes = useAppSelector(NodesSelectors.getNodes);

  return React.useCallback(() => {
    if (!selected.length) return;
    const updates: NodesMap = {};
    for (const id of selected) {
      const node = nodes[id];

      updates[id] = { ...node, hidden: !node.hidden };
    }
    invalidate(selected);
    dispatch(NodesActions.batchUpsertNodes(updates));
  }, [dispatch, invalidate, selected, nodes]);
}

const offsetPosition = (node: MapNodeV2) => {
  return toTuple3([
    node.position[0],
    node.position[1],
    node.position[2] - node.scale[2] / 2,
  ]);
};

export function useEditNodeAsAddition(node?: MapNodeV2) {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const invalidate = useInvalidateTransformsCache();
  const onTransfer = useChangeNodeTag(node);

  return React.useCallback(() => {
    if (!node) return;

    if (node.parent) invalidate([node.parent]);
    const clones = cloneNode(nodes, index, node);
    const clonesMap: NodesMap = {};

    clones[0].parent = null;
    for (const clone of clones) {
      clonesMap[clone.id] = clone;
      clone.tag = "create";
      clone.indexInDistrict = -1;
      clone.position = offsetPosition(clone);
    }

    dispatch(NodesActions.batchUpsertNodes(clonesMap));
    onTransfer("delete", "create");
    dispatch(NodesActions.selectNode(clones[0].id));
  }, [dispatch, invalidate, nodes, index, node, onTransfer]);
}

const getNodeAncestors = (index: NodesIndex, node: MapNodeV2) => {
  if (!node.parent) return [];
  return [node.parent, ...index[node.parent].ancestorIds];
};
const getNodeDescendants = (index: NodesIndex, id: string) => {
  if (!index[id]) return [];
  return [...index[id].descendantIds];
};

export function useInvalidateTransformsCache() {
  const store = useAppStore();

  return React.useCallback(
    (updates: string[]) => {
      const state = store.getState();
      const nodes = NodesSelectors.getNodes(state);
      const index = NodesSelectors.getNodesIndex(state);
      const ids = [...updates];

      for (const id of updates) {
        const node = nodes[id];

        if (node.parent) ids.push(...getNodeAncestors(index, node));
        if (node.type === "group") ids.push(...getNodeDescendants(index, id));
      }

      invalidateCachedTransforms(ids);
    },
    [store],
  );
}
