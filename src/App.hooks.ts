import * as React from "react";

import { useAppDispatch, useAppSelector, useAppStore } from "./hooks.ts";
import { Map3D } from "./map3d/map3d.ts";
import {
  getAdditionsTransforms,
  getDeletions,
  getDeletionsTransforms,
  getDistrictNodes,
  getUpdates,
  getUpdatesTransforms,
} from "./store/@selectors.ts";
import { DistrictSelectors } from "./store/district.ts";
import { ModalsActions } from "./store/modals.ts";
import { NodesActions, NodesSelectors } from "./store/nodes.ts";
import { OptionsSelectors } from "./store/options.ts";
import { ProjectSelectors } from "./store/project.ts";
import type { District, DistrictWithTransforms } from "./types/types.ts";
import { getFinalDistrictTransformsFromNodes } from "./utilities/district.ts";
import { parseNode } from "./utilities/nodes.ts";
import { applyTransforms, transformToNode } from "./utilities/transforms.ts";
import { invariant, toNumber, toString } from "./utilities/utilities.ts";

const emptyArray: unknown[] = [];

export function useInitMap3D(ref: React.RefObject<HTMLCanvasElement | null>) {
  const [map3d, setMap3D] = React.useState<Map3D | null>(null);
  const store = useAppStore();

  React.useEffect(() => {
    if (!ref.current) return;

    const map3d = new Map3D(ref.current, store);
    setMap3D(map3d);

    return () => {
      map3d.dispose();
      setMap3D(null);
    };
  }, [ref, store]);

  return map3d;
}

export function useDrawAllDistricts(map3d: Map3D | null) {
  const store = useAppStore();
  const currentDistrict = useAppSelector(DistrictSelectors.getDistrict);
  const allDistricts = useAppSelector(DistrictSelectors.getAllDistricts);
  const districtView = useAppSelector(OptionsSelectors.getDistrictView);
  const visibleDistrictNames = useAppSelector(
    OptionsSelectors.getVisibleDistricts,
  );
  const nonCurrentDistricts = React.useMemo(() => {
    if (!currentDistrict) return emptyArray as District[];

    const districtsVisibilityMap: Record<string, District[]> = {
      all: allDistricts,
      current: [currentDistrict],
      custom: allDistricts.filter((district) =>
        visibleDistrictNames.includes(district.name),
      ),
    };
    const visibleDistricts = districtsVisibilityMap[districtView];

    return visibleDistricts.filter(
      (district) => district.name !== currentDistrict.name,
    );
  }, [currentDistrict, allDistricts, visibleDistrictNames, districtView]);

  React.useEffect(() => {
    if (!map3d) return;

    const districtsWithTransforms: DistrictWithTransforms[] = [];
    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);
    const cache = NodesSelectors.getChildNodesCache(state);

    for (const district of nonCurrentDistricts) {
      const districtCache = cache[district.name];
      const transforms = getFinalDistrictTransformsFromNodes(
        nodes,
        district,
        districtCache,
      );

      districtsWithTransforms.push({
        district,
        transforms,
      });
    }

    map3d.setVisibleDistricts(districtsWithTransforms);
  }, [map3d, nonCurrentDistricts, store]);
}

export function useDrawCurrentDistrict(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const updates = useAppSelector(getUpdates);
  const deletions = useAppSelector(getDeletions);
  const updateIds = React.useMemo(
    () => new Set(updates.map((node) => node.id)),
    [updates],
  );
  const deletionIds = React.useMemo(
    () => new Set(deletions.map((node) => node.id)),
    [deletions],
  );

  // TODO optimize - don't recalc updates/deletions if additions change
  React.useEffect(() => {
    if (!map3d || !district) return;

    const transforms = district.transforms.map((instance) => {
      if (updateIds.has(instance.id) || deletionIds.has(instance.id)) {
        return { ...instance, scale: { x: 0, y: 0, z: 0, w: 0 } };
      }

      return instance;
    });

    map3d.setCurrentDistrict({ district, transforms });
  }, [map3d, district, updateIds, deletionIds]);

  React.useEffect(() => {
    if (!map3d || !district) return;

    map3d.lookAtCurrentDistrict();
  }, [map3d, district]);
}

export function useDrawAdditions(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(getAdditionsTransforms);

  React.useEffect(() => {
    if (!map3d || !district) return;

    map3d.setAdditions({ district, transforms });
  }, [map3d, district, transforms]);
}

export function useDrawUpdates(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(getUpdatesTransforms);

  React.useEffect(() => {
    if (!map3d || !district) return;

    map3d.setUpdates({ district, transforms });
  }, [map3d, district, transforms]);
}

export function useDrawDeletions(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(getDeletionsTransforms);

  React.useEffect(() => {
    if (!map3d || !district) return;
    map3d.setDeletions({ district, transforms });
  }, [map3d, district, transforms]);
}

export function useDrawSelection(map3d: Map3D | null) {
  const mode = useAppSelector(ProjectSelectors.getMode);
  const additions = useAppSelector(getAdditionsTransforms);
  const updates = useAppSelector(getUpdatesTransforms);
  const deletions = useAppSelector(getDeletionsTransforms);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const nodes = useAppSelector(getDistrictNodes);
  const nodesMap = React.useMemo(
    () => new Map(nodes.map((node) => [node.id, parseNode(node)])),
    [nodes],
  );

  React.useEffect(() => {
    if (!map3d) return;

    if (editing == null) {
      map3d.selectInstances([]);
      return;
    }

    const indexes: number[] = [];
    const selectedIds = new Set(
      editing.type === "instance" ? [editing.id] : cache[editing.id].i,
    );

    if (mode === "create") {
      for (let index = 0; index < additions.length; index++) {
        const transform = additions[index];

        if (selectedIds.has(transform.id as string)) {
          indexes.push(index);
        }
      }
    } else if (mode === "delete") {
      for (const transform of deletions) {
        if (selectedIds.has(transform.id as string)) {
          indexes.push(toNumber(transform.id as string));
        }
      }
    } else if (mode === "update") {
      for (const transform of updates) {
        if (selectedIds.has(transform.id as string)) {
          indexes.push(toNumber(transform.id as string));
        }
      }
    }

    map3d.selectInstances(indexes);
  }, [editing, cache, deletions, additions, map3d, mode, updates]);

  React.useEffect(() => {
    if (!map3d || mode === "delete") return;
    if (!editing) {
      map3d.setHelper(undefined);
    } else {
      map3d.setHelper(applyTransforms(parseNode(editing), nodesMap), true);
    }
  }, [map3d, mode, editing, nodesMap]);
}

export function useMap3DEvents(map3d: Map3D | null) {
  const dispatch = useAppDispatch();
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const additions = useAppSelector(getAdditionsTransforms);
  const updates = useAppSelector(getUpdates);

  React.useEffect(() => {
    if (!map3d) return;

    const onSelect = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const index = event.detail.index;

        if (index != null) {
          const id =
            mode === "create"
              ? additions[index].id
              : mode === "update"
                ? updates[index].id
                : null;

          if (id != null) {
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
            invariant(district, "District is not defined");
            const node = transformToNode(district.transforms[index], district, {
              label: `Box #${index}`,
              parent: district.name,
              tag: "delete",
              id: toString(index),
            });
            dispatch(NodesActions.addNode(node));
            dispatch(NodesActions.setEditing(toString(index)));
          }
        });
      }
    }) as EventListener;
    const onUpdate = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const { index } = event.detail;

        invariant(district, "District is not defined");
        const id = toString(index);
        if (!updates.some((nodes) => nodes.id === id)) {
          const node = transformToNode(district.transforms[index], district, {
            label: `Box #${index}`,
            parent: district.name,
            tag: "update",
            id,
          });
          dispatch(NodesActions.addNode(node));
        }
        dispatch(NodesActions.setEditing(id));
      }
    }) as EventListener;

    window.addEventListener("select-node", onSelect);
    window.addEventListener("remove-node", onRemove);
    window.addEventListener("update-node", onUpdate);

    return () => {
      window.removeEventListener("select-node", onSelect);
      window.removeEventListener("remove-node", onRemove);
      window.removeEventListener("update-node", onUpdate);
    };
  }, [map3d, dispatch, additions, updates, district, mode]);
}
