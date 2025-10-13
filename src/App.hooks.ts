import * as React from "react";

import { useAppDispatch, useAppSelector } from "./hooks.ts";
import { Map3D } from "./map3d/map3d.ts";
import { getDistrictInstancedMeshTransforms } from "./store/district.selectors.ts";
import { DistrictSelectors } from "./store/district.ts";
import { ModalsActions } from "./store/modals.ts";
import { getNodesInstancedMeshTransforms } from "./store/nodes.selectors.ts";
import { NodesActions, NodesSelectors } from "./store/nodes.ts";
import { toNumber, toString } from "./utilities.ts";

export function useInitMap3D(ref: React.RefObject<HTMLCanvasElement | null>) {
  const [map3d, setMap3D] = React.useState<Map3D | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const map3d = new Map3D(ref.current);
    setMap3D(map3d);

    return () => {
      map3d.dispose();
      setMap3D(null);
    };
  }, [ref]);

  return map3d;
}

export function useDrawCurrentDistrict(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(getDistrictInstancedMeshTransforms);

  React.useEffect(() => {
    if (!map3d || !district) return;

    map3d.setCurrentDistrict({ district, transforms });
  }, [map3d, district, transforms]);
}

export function useDrawAdditions(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(getNodesInstancedMeshTransforms);

  React.useEffect(() => {
    if (!map3d || !district) return;

    map3d.setAdditions({ district, transforms });
  }, [map3d, district, transforms]);
}

export function useDrawSelection(map3d: Map3D | null, mode: "add" | "remove") {
  const transforms = useAppSelector(getNodesInstancedMeshTransforms);
  const removals = useAppSelector(NodesSelectors.getRemovals);
  const editingId = useAppSelector(NodesSelectors.getEditingId);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);

  React.useEffect(() => {
    if (!map3d) return;

    if (editingId == null) {
      map3d.selectInstances([]);
      return;
    }

    const indexes: number[] = [];

    if (mode === "add") {
      if (!editing) return;

      const selectedIds = new Set(
        editing.type === "instance"
          ? [editing.id]
          : cache[editing.id].i.flat(99),
      );
      for (const transform of transforms) {
        if (selectedIds.has(transform.id)) {
          indexes.push(transforms.indexOf(transform));
        }
      }
    } else {
      const index = removals.indexOf(toNumber(editingId));
      indexes.push(index);
    }

    map3d.selectInstances(indexes);
  }, [editing, editingId, cache, removals, transforms, map3d, mode]);
}

export function useMap3DEvents(map3d: Map3D | null) {
  const dispatch = useAppDispatch();
  const transforms = useAppSelector(getNodesInstancedMeshTransforms);

  React.useEffect(() => {
    if (!map3d) return;

    const onSelect = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const index = event.detail.index;

        if (index != null) {
          const id = transforms[index].id;

          if (id) {
            dispatch(NodesActions.setEditing(id));
          }
        } else {
          dispatch(NodesActions.setEditing(null));
        }
      }
    }) as EventListener;
    const onRemove = ((
      event: CustomEvent<{ index: number; position: [number, number] }>,
    ) => {
      if (event.detail) {
        const { index, position } = event.detail;

        dispatch(
          ModalsActions.openModal("confirm-instance-exclusion", {
            index,
            position,
          }),
        ).then((confirmed) => {
          if (confirmed) {
            map3d.dontLookAt = true;
            dispatch(NodesActions.excludeTransform(index));
            dispatch(NodesActions.setEditing(toString(index)));
          }
        });
      }
    }) as EventListener;

    window.addEventListener("select-node", onSelect);
    window.addEventListener("remove-node", onRemove);

    return () => {
      window.removeEventListener("select-node", onSelect);
      window.removeEventListener("remove-node", onRemove);
    };
  }, [map3d, dispatch, transforms]);
}
