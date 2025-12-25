import * as React from "react";

import { useAppDispatch, useAppSelector, useAppStore } from "./hooks/hooks.ts";
import { getParent } from "./hooks/nodes.hooks.ts";
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
import { NodesActions, NodesSelectors } from "./store/nodes.ts";
import { OptionsSelectors } from "./store/options.ts";
import { ProjectSelectors } from "./store/project.ts";
import type {
  District,
  DistrictWithTransforms,
  MapNode,
} from "./types/types.ts";
import {
  getFinalDistrictTransformsFromNodes,
  immutableDistrictTransforms,
} from "./utilities/district.ts";
import { parseNode, transplantNode } from "./utilities/nodes.ts";
import { applyTransforms, transformToNode } from "./utilities/transforms.ts";
import { invariant, toNumber, toString } from "./utilities/utilities.ts";

const emptyArray: District[] = [];

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
    const districtsVisibilityMap: Record<string, District[]> = {
      all: allDistricts,
      current: emptyArray,
      custom: allDistricts.filter((district) =>
        visibleDistrictNames.includes(district.name),
      ),
    };
    const visibleDistricts = districtsVisibilityMap[districtView];

    if (!currentDistrict) return visibleDistricts;

    return visibleDistricts.filter(
      (district) => district.name !== currentDistrict.name,
    );
  }, [currentDistrict, allDistricts, visibleDistrictNames, districtView]);

  React.useEffect(() => {
    if (!map3d) return;

    const districtsWithTransforms: DistrictWithTransforms[] = [];
    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);

    for (const district of nonCurrentDistricts) {
      const transforms = getFinalDistrictTransformsFromNodes(nodes, district);

      districtsWithTransforms.push({
        district,
        transforms,
      });
    }

    map3d.setVisibleDistricts(districtsWithTransforms);
  }, [map3d, nonCurrentDistricts, store]);
}

export function useDrawCurrentDistrict(map3d: Map3D | null) {
  const project = useAppSelector(ProjectSelectors.getProjectName);
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

  React.useEffect(() => {
    if (!map3d || !district) return;

    const transforms = (
      immutableDistrictTransforms.get(district.name) ?? []
    ).map((instance) => {
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

  React.useEffect(() => {
    if (!map3d || project) return;

    map3d.reset();
  }, [map3d, project]);
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
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const nodes = useAppSelector(getDistrictNodes);
  const nodesMap = React.useMemo(
    () => new Map(nodes.map((node) => [node.id, parseNode(node)])),
    [nodes],
  );
  const tool = useAppSelector(ProjectSelectors.getTool);

  React.useEffect(() => {
    if (!map3d) return;

    if (selected.length === 0) {
      map3d.selectInstances([]);
      return;
    }

    const indexes: number[] = [];
    const selectedIds = selected.reduce((set, node) => {
      if (node.type === "instance") set.add(node.id);
      else cache[node.id].instances.forEach((id) => set.add(id));
      return set;
    }, new Set<string>());

    if (mode === "create") {
      for (let index = 0; index < additions.length; index++) {
        const transform = additions[index];

        if (selectedIds.has(transform.id)) {
          indexes.push(index);
        }
      }
    } else if (mode === "delete") {
      for (const transform of deletions) {
        if (selectedIds.has(transform.id)) {
          indexes.push(toNumber(transform.id));
        }
      }
    } else if (mode === "update") {
      for (const transform of updates) {
        if (selectedIds.has(transform.id)) {
          indexes.push(toNumber(transform.id));
        }
      }
    }

    map3d.selectInstances(indexes);
  }, [selected, cache, deletions, additions, map3d, mode, updates]);

  React.useEffect(() => {
    if (!map3d || mode === "delete") return;
    if (selected.length !== 1) {
      map3d.setHelper(undefined);
    } else {
      map3d.setHelper(applyTransforms(parseNode(selected[0]), nodesMap), true);
    }
  }, [map3d, mode, selected, nodesMap]);

  React.useEffect(() => {
    if (!map3d) return;
    map3d.clearPointer();
  }, [map3d, tool]);
}

export function useMap3DEvents(map3d: Map3D | null) {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const additions = useAppSelector(getAdditionsTransforms);
  const updates = useAppSelector(getUpdates);

  const addNode = React.useCallback(
    (index: number, tag: MapNode["tag"]) => {
      invariant(district, "Unexpected error: District is not defined");
      const transform = immutableDistrictTransforms.get(district.name)?.[index];
      invariant(transform, "Transform is not defined");

      const parent = getParent(district, selected[0]);
      const id = toString(index);

      // If the user clicks twice without moving mouse, the highlighted block
      // will stay the same and trigger event twice
      if (nodes.find((node) => node.id === id)) return;

      const node = transformToNode(transform, district, {
        label: `Block #${index}`,
        parent: district.name,
        district: district.name,
        tag,
        id,
      });
      const nodeWithCorrectParent = transplantNode(nodes, node, parent);
      dispatch(NodesActions.addNode(nodeWithCorrectParent));
      dispatch(NodesActions.selectNode({ id }));
    },
    [district, selected, nodes, dispatch],
  );

  React.useEffect(() => {
    if (!map3d) return;

    const onSelect = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const { index } = event.detail;

        if (index != null) {
          const id =
            mode === "create"
              ? additions[index].id
              : mode === "update"
                ? updates[index].id
                : null;

          if (id != null) {
            dispatch(NodesActions.selectNode({ id }));
          }
        } else {
          dispatch(NodesActions.selectNode(null));
        }
      }
    }) as EventListener;
    const onRemove = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail?.index != null) {
        addNode(event.detail.index, "delete");
      }
    }) as EventListener;
    const onUpdate = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail?.index != null) {
        addNode(event.detail.index, "update");
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
  }, [addNode, additions, mode, updates, dispatch, map3d]);
}
