import { nanoid } from "nanoid";
import * as React from "react";
import { ActionCreators } from "redux-undo";

import {
  useAppDispatch,
  useAppSelector,
  useAppStore,
  useGlobalShortcuts,
} from "./hooks/hooks.ts";
import { useDownloadProject } from "./hooks/importExport.ts";
import {
  useCloneNode,
  useDeleteNode,
  useDeselectNode,
  useHideNode,
  useInvalidateTransformsCache,
} from "./hooks/nodes.hooks.ts";
import { Map3D } from "./map3d/map3d.ts";
import { DistrictSelectors } from "./store/district.ts";
import { ModalsActions, ModalsSelectors } from "./store/modals.ts";
import { NodesActions, NodesSelectors } from "./store/nodesV2.ts";
import { OptionsSelectors } from "./store/options.ts";
import { ProjectActions, ProjectSelectors } from "./store/project.ts";
import type {
  District,
  DistrictWithTransforms,
  MapNodeV2,
  TreeNode,
} from "./types/types.ts";
import {
  getFinalDistrictTransformsFromNodes,
  immutableDistrictTransforms,
} from "./utilities/district.ts";
import {
  applyTransforms,
  getTransformsFromSubtree,
} from "./utilities/getTransformsFromSubtree.ts";
import { resolveParent, transplantNode } from "./utilities/nodes.ts";
import { transformToNode } from "./utilities/transforms.ts";
import { invariant, partition } from "./utilities/utilities.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyArray: any[] = [];

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

export function useShortcuts(map3d: Map3D | null) {
  const dispatch = useAppDispatch();
  const projectName = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const modal = useAppSelector(ModalsSelectors.getModal);
  const hasPast = useAppSelector((state) => state.past.length > 0);
  const hasFuture = useAppSelector((state) => state.future.length > 0);
  const invalidate = useInvalidateTransformsCache();

  const deselectNode = useDeselectNode();
  const hideNode = useHideNode(selected);
  const deleteNode = useDeleteNode(selected);
  const saveProject = useDownloadProject();
  const cloneNode = useCloneNode(nodes[selected[0]]);

  useGlobalShortcuts("KeyW", () => dispatch(ProjectActions.setTool("move")));
  useGlobalShortcuts("KeyS", () => dispatch(ProjectActions.setTool("select")));

  useGlobalShortcuts("KeyA", () => {
    dispatch(ProjectActions.setMode("create"));
    deselectNode();
  });
  useGlobalShortcuts(
    "KeyE",
    () => {
      dispatch(ProjectActions.setMode("update"));
      deselectNode();
    },
    district?.isCustom,
  );
  useGlobalShortcuts(
    "KeyD",
    () => {
      dispatch(ProjectActions.setMode("delete"));
      deselectNode();
    },
    district?.isCustom,
  );

  useGlobalShortcuts("KeyR", () => map3d?.resetCamera());
  useGlobalShortcuts("Shift+KeyR", () => map3d?.lookAtCurrentDistrict());

  useGlobalShortcuts("Escape", () => {
    if (modal) return dispatch(ModalsActions.closeModal());
    if (selected.length) return deselectNode();
  });
  useGlobalShortcuts("KeyH", () => hideNode(), !selected.length);
  useGlobalShortcuts("Delete", () => deleteNode(), !selected.length);
  useGlobalShortcuts(
    "Alt+Control+KeyC",
    () => cloneNode(),
    selected.length !== 1,
  );

  useGlobalShortcuts(
    "Control+KeyZ",
    () => {
      if (selected.length) invalidate(selected);
      dispatch(ActionCreators.undo());
      map3d?.render();
    },
    !hasPast,
  );
  useGlobalShortcuts(
    "Control+Shift+KeyZ",
    () => {
      if (selected.length) invalidate(selected);
      dispatch(ActionCreators.redo());
      map3d?.render();
    },
    !hasFuture,
  );
  useGlobalShortcuts("Control+Shift+KeyS", () => saveProject(), !projectName);

  useGlobalShortcuts(
    "Alt+Control+KeyE",
    () => dispatch(ModalsActions.openModal("import-export", "export")),
    !district,
  );
  useGlobalShortcuts(
    "Alt+Control+KeyI",
    () => dispatch(ModalsActions.openModal("import-export", "import")),
    !district,
  );
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
    const tree = NodesSelectors.getNodesTree(state);

    for (const district of nonCurrentDistricts) {
      const transforms = getFinalDistrictTransformsFromNodes(
        district,
        nodes,
        tree,
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
  const store = useAppStore();
  const project = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const root = index[district?.name ?? ""];

  React.useEffect(() => {
    if (!map3d || !district) return;

    const baseTransforms = immutableDistrictTransforms.get(district.name) ?? [];

    if (root) {
      const nodes = NodesSelectors.getNodes(store.getState());
      const { update: updates = [], delete: deletions = [] } = partition(
        root.descendantIds,
        (id) => nodes[id].tag,
      );
      const updateIndexes = new Set(
        updates.map((id) => nodes[id].indexInDistrict),
      );
      const deletionIndexes = new Set(
        deletions.map((id) => nodes[id].indexInDistrict),
      );

      const transforms = baseTransforms.map((instance, index) => {
        if (updateIndexes.has(index) || deletionIndexes.has(index)) {
          return { ...instance, scale: { x: 0, y: 0, z: 0, w: 0 } };
        }

        return instance;
      });
      map3d.setCurrentDistrict({ district, transforms });
    } else {
      map3d.setCurrentDistrict({ district, transforms: baseTransforms });
    }
  }, [map3d, district, store, root]);

  React.useEffect(() => {
    if (!map3d || project) return;

    map3d.reset();
  }, [map3d, project]);
}

export function useDrawAdditions(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const additions = React.useMemo<TreeNode[]>(() => {
    if (!district || !tree[district.name]) return emptyArray;
    const root = tree[district.name];
    invariant(root.type === "district", "Unexpected tree node type");
    return root.create;
  }, [district, tree]);

  React.useEffect(() => {
    if (!map3d || !district) return;

    const transforms = getTransformsFromSubtree(district, nodes, additions);

    map3d.setAdditions({ district, transforms });
  }, [map3d, district, nodes, additions]);
}

export function useDrawUpdates(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const updates = React.useMemo<TreeNode[]>(() => {
    if (!district || !tree[district.name]) return emptyArray;
    const root = tree[district.name];
    invariant(root.type === "district", "Unexpected tree node type");
    return root.update;
  }, [district, tree]);

  React.useEffect(() => {
    if (!map3d || !district) return;

    const transforms = getTransformsFromSubtree(district, nodes, updates);

    map3d.setUpdates({ district, transforms });
  }, [map3d, district, nodes, updates]);
}

export function useDrawDeletions(map3d: Map3D | null) {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const deletions = React.useMemo<TreeNode[]>(() => {
    if (!district || !tree[district.name]) return emptyArray;
    const root = tree[district.name];
    invariant(root.type === "district", "Unexpected tree node type");
    return root.delete;
  }, [district, tree]);

  React.useEffect(() => {
    if (!map3d || !district) return;

    const transforms = getTransformsFromSubtree(district, nodes, deletions);

    map3d.setDeletions({ district, transforms });
  }, [map3d, district, nodes, deletions]);
}

export function useDrawSelection(map3d: Map3D | null) {
  const store = useAppStore();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const mode = useAppSelector(ProjectSelectors.getMode);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tool = useAppSelector(ProjectSelectors.getTool);

  React.useEffect(() => {
    if (!map3d || !district) return;

    if (selected.length === 0) {
      map3d.selectInstances([]);
      return;
    }

    const state = store.getState();
    const nodes = NodesSelectors.getNodes(state);
    const index = NodesSelectors.getNodesIndex(state);

    const allSelected = new Set<string>(
      selected.flatMap((id) => {
        const node = nodes[id];
        if (node.type === "instance") return [id];
        return index[node.id].descendantIds.filter(
          (id) => nodes[id].type == "instance",
        );
      }),
    );

    map3d.selectInstances([...allSelected.values()]);
  }, [selected, map3d, district, mode, store]);

  React.useEffect(() => {
    if (!map3d || mode === "delete") return;
    if (selected.length !== 1) {
      map3d.setHelper(undefined);
    } else {
      map3d.setHelper(applyTransforms(nodes, nodes[selected[0]]), true);
    }
  }, [map3d, mode, selected, nodes]);

  React.useEffect(() => {
    if (!map3d) return;
    map3d.clearPointer();
  }, [map3d, tool]);
}

export function useMap3DEvents(map3d: Map3D | null) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const invalidate = useInvalidateTransformsCache();

  const addNode = React.useCallback(
    (index: number, tag: MapNodeV2["tag"]) => {
      if (!district) return;
      const transform = immutableDistrictTransforms.get(district.name)?.[index];
      if (!transform) return;

      const state = store.getState();
      const nodes = NodesSelectors.getNodes(state);
      const tree = NodesSelectors.getNodesTree(state);

      const parent = resolveParent(nodes[selected[0]]);
      const id = nanoid();

      // If the user clicks twice without moving mouse, the highlighted block
      // will stay the same and trigger event twice
      const districtTree = tree[district.name];
      if (
        districtTree &&
        districtTree.type === "district" &&
        districtTree[tag].find(
          (treeNode) => nodes[treeNode.id].indexInDistrict === index,
        )
      )
        return;

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
        invalidate([parent]);
        dispatch(NodesActions.createNode(nodeWithCorrectParent));
      } else {
        dispatch(NodesActions.createNode(node));
      }
      dispatch(NodesActions.selectNode(id));
    },
    [district, selected, dispatch, store, invalidate],
  );

  React.useEffect(() => {
    if (!map3d || !district) return;

    const onSelect = ((event: CustomEvent<{ id: string }>) => {
      if (event.detail) {
        const { id } = event.detail;

        if (id != null) {
          dispatch(NodesActions.selectNode(id));
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
  }, [addNode, mode, store, dispatch, district, map3d]);
}
