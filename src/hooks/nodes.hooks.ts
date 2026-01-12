import * as React from "react";

import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import { ProjectActions } from "../store/project.ts";
import type { MapNodeV2, Modes, NodesIndex, Plane } from "../types/types.ts";
import { getParent } from "../utilities/nodes.ts";
import { invalidateCachedTransforms } from "../utilities/transforms.ts";
import { toTuple3 } from "../utilities/utilities.ts";
import { useAppDispatch, useAppSelector, useAppStore } from "./hooks.ts";

export function useFocusNode(node: MapNodeV2) {
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selected.at(-1) === node.id) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected, node]);

  return ref;
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

  return React.useCallback(
    (updates?: Partial<MapNodeV2>) => {
      if (!node) return;
      if (node.parent) invalidate([node.parent]);
      dispatch(
        NodesActions.cloneNode({
          id: node.id,
          updates,
        }),
      );
    },
    [dispatch, node, invalidate],
  );
}

export function useChangeNodeTag(node?: MapNodeV2) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();

  return React.useCallback(
    (tag: MapNodeV2["tag"], mode: Modes = tag) => {
      if (!node) return;
      if (node.parent) invalidate([node.parent]);
      dispatch(NodesActions.editNode({ id: node.id, parent: null, tag }));
      dispatch(ProjectActions.setMode(mode));
    },
    [dispatch, node, invalidate],
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

    const parent = getParent(nodes[selectedNodes[0]]);
    const center = map3d.getCenter();
    const position = toTuple3(parent ? [0, 0, 0] : center);

    if (parent) invalidate([parent]);
    dispatch(
      NodesActions.addNode({
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
        NodesActions.editNode({
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
    const updates: MapNodeV2[] = [];
    for (const id of selected) {
      const node = nodes[id];

      updates.push({
        ...node,
        hidden: !node.hidden,
      });
    }
    invalidate(selected);
    dispatch(NodesActions.editNodes(updates));
  }, [dispatch, invalidate, selected, nodes]);
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
