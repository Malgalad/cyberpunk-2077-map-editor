import * as React from "react";

import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { DistrictProperties, MapNode } from "../types/types.ts";
import { toString } from "../utilities/utilities.ts";
import { useAppDispatch, useAppSelector } from "./hooks.ts";

export function getParent(district: DistrictProperties, node?: MapNode) {
  return node ? (node.type === "group" ? node.id : node.parent) : district.name;
}

export function useFocusNode(node: MapNode) {
  const selected = useAppSelector(NodesSelectors.getSelectedNodeIds);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (selected[0] === node.id) {
      ref.current?.scrollIntoView({ behavior: "smooth" });
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

export function useCloneNode() {
  const dispatch = useAppDispatch();
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);

  return React.useCallback(() => {
    if (selectedNodes.length !== 1) return;
    dispatch(NodesActions.cloneNode({ id: selectedNodes[0].id }));
  }, [dispatch, selectedNodes]);
}

export function useDeleteNode() {
  const dispatch = useAppDispatch();
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);

  return React.useCallback(async () => {
    if (selectedNodes.length === 0) return;

    const message =
      selectedNodes.length > 1
        ? `Do you want to delete ${selectedNodes.length} nodes?`
        : `Do you want to delete node "${selectedNodes[0].label}"?`;
    const confirmed = await dispatch(
      ModalsActions.openModal("confirm", message),
    );

    if (confirmed) {
      dispatch(
        NodesActions.deleteNodesDeep(selectedNodes.map((node) => node.id)),
      );
    }
  }, [dispatch, selectedNodes]);
}

export function useAddNode(type: MapNode["type"], tag: MapNode["tag"]) {
  const dispatch = useAppDispatch();
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);
  const selectedDistrict = useAppSelector(DistrictSelectors.getDistrict);
  const map3d = useMap3D();

  return React.useCallback(() => {
    if (selectedNodes.length > 1 || !selectedDistrict || !map3d) return;

    const parent = getParent(selectedDistrict, selectedNodes[0]);
    const center = map3d.getCenter();
    const position = center.map(toString) as MapNode["position"];

    const action = dispatch(
      NodesActions.addNode({
        type,
        tag,
        parent,
        position,
      }),
    );
    dispatch(
      NodesActions.selectNode({
        id: action.payload.id,
      }),
    );
  }, [dispatch, selectedNodes, selectedDistrict, map3d, tag, type]);
}
