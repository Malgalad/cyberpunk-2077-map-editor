import {
  Square,
  SquareCheck,
  SquareDashed,
  SquareMinus,
  SquarePlus,
} from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import Select from "../components/common/Select.tsx";
import { TEMPLATE_ID } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { ModalProps } from "../types/modals.ts";
import type { NodesMap, TreeNode } from "../types/types.ts";
import type { SelectItem } from "../types/ui.types.ts";
import { getDistrictName } from "../utilities/district.ts";
import { transplantNode } from "../utilities/nodes.ts";
import { clsx } from "../utilities/utilities.ts";

const getLabel = (
  label: string,
  { current, self }: { current?: boolean; self?: boolean },
) => clsx(label, current && "(Current)", self && "(Self)");

function UpdateNodeParentModal(props: ModalProps) {
  const selected = props.data as string[];
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);

  const node = nodes[selected[0]];
  const isTemplate = node.district === TEMPLATE_ID;

  const [currentDistrict, setCurrentDistrict] = React.useState(node.district);
  const [currentParent, setCurrentParent] = React.useState(node.parent);
  const [expanded, setExpanded] = React.useState(
    new Set<string>(
      Object.values(index)
        .filter((index) =>
          index.descendantIds.some((id) => selected.includes(id)),
        )
        .map((index) => index.treeNode.id),
    ),
  );

  const root = tree[currentDistrict];
  const branches = root
    ? root.type === "district"
      ? root[node.tag]
      : root.children
    : [];

  const districtItems: SelectItem[] = districts.map((district) => ({
    label: getLabel(getDistrictName(district), {
      current: node.district === district.name && !node.parent,
    }),
    value: district.name,
    disabled: node.district === district.name && !node.parent,
  }));

  const updateNodeParent = () => {
    const updates: NodesMap = {};
    const toInvalidate: string[] = [];

    if (currentParent) toInvalidate.push(currentParent);

    for (const id of selected) {
      const node = nodes[id];
      const twig = transplantNode(nodes, node, currentParent, currentDistrict);

      toInvalidate.push(id);
      updates[id] = twig;

      if (node.type === "group" && node.district !== currentDistrict) {
        const children = index[node.id].descendantIds;

        for (const childId of children) {
          const child = nodes[childId];

          toInvalidate.push(childId);
          updates[childId] = { ...child, district: twig.district };
        }
      }
    }

    invalidate(toInvalidate);
    dispatch(NodesActions.batchUpsertNodes(updates));
    if (currentDistrict !== node.district) {
      setTimeout(() => {
        dispatch(DistrictActions.selectDistrict(currentDistrict));
        if (!isTemplate) {
          dispatch(NodesActions.selectNodes(selected));
        }
      }, 0);
    }
    props.onClose();
  };

  const toggleExpanded =
    (id: string): React.MouseEventHandler<SVGSVGElement> =>
    (event) => {
      event.stopPropagation();
      const next = new Set(expanded);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setExpanded(next);
    };
  const renderRootNode = () => {
    const checked = null === currentParent;
    const current = null === node.parent;
    const disabled = current;

    return (
      <div
        className={clsx(
          "flex flex-row items-center gap-1 cursor-pointer",
          disabled && "text-slate-400",
        )}
        onClick={() => !disabled && setCurrentParent(null)}
        tabIndex={-1}
      >
        {checked ? <SquareCheck /> : <Square />}
        <span>{getLabel("<Root>", { current })}</span>
      </div>
    );
  };
  const renderTreeNode = (treeNode: TreeNode) => {
    const mapNode = nodes[treeNode.id];
    const checked = mapNode.id === currentParent;
    const current = mapNode.id === node.parent;
    const self = selected.includes(mapNode.id);
    const disabled = current || self;
    const groupChildren = treeNode.children.filter(
      (child) => child.type === "group",
    );
    const hasChildren = groupChildren.length > 0;

    return (
      <React.Fragment key={treeNode.id}>
        <div
          className={clsx(
            "flex flex-row items-center gap-1 cursor-pointer",
            disabled && "text-slate-400",
          )}
          onClick={() => !disabled && setCurrentParent(mapNode.id)}
          tabIndex={-1}
        >
          {checked ? <SquareCheck /> : <Square />}
          {expanded.has(mapNode.id) ? (
            <SquareMinus onClick={toggleExpanded(mapNode.id)} />
          ) : disabled || !hasChildren ? (
            <SquareDashed />
          ) : (
            <SquarePlus onClick={toggleExpanded(mapNode.id)} />
          )}
          <span>{getLabel(mapNode.label, { current, self })}</span>
        </div>
        {hasChildren && expanded.has(mapNode.id) && (
          <div className="pl-2 flex flex-col gap-0.5">
            {groupChildren.map(renderTreeNode)}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <Modal
      className="w-[480px]"
      title={
        selected.length > 1
          ? `Update parent of ${selected.length} nodes`
          : `Update parent of "${node.label}"`
      }
      footer={
        <>
          <Button onClick={() => props.onClose()}>Cancel</Button>
          <Button onClick={() => updateNodeParent()}>Confirm</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {!isTemplate && (
          <div className="flex flex-row gap-2 items-center">
            <div className="w-14">District:</div>
            <Select
              items={districtItems}
              value={currentDistrict}
              onChange={(event) => setCurrentDistrict(event.target.value)}
            />
          </div>
        )}
        <div className="flex flex-row gap-2">
          <div className="w-14 shrink-0">Parent:</div>
          <div className="flex flex-col gap-0.5 w-full max-h-48 overflow-y-auto bg-slate-800 p-1">
            {renderRootNode()}
            {branches
              .filter((treeNode) => treeNode.type === "group")
              .map(renderTreeNode)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default UpdateNodeParentModal;
