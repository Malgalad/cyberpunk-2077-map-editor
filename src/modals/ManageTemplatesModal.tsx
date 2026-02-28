import { FolderPlus, MinusSquare, PlusSquare, Trash2 } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import {
  useChangeLabel,
  useChangeParent,
} from "../components/EditNode.Properties.hooks.ts";
import { TEMPLATE_ID } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useDeleteNode } from "../hooks/nodes.hooks.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { NodesMap, TreeNode } from "../types/types.ts";
import { resolveParent } from "../utilities/nodes.ts";
import { clsx, invariant } from "../utilities/utilities.ts";

interface TemplateNodeProps {
  node: TreeNode;
  nodes: NodesMap;
  selected: string[];
  setSelected: (selected: string[]) => void;
}

function TemplateGroup(props: TemplateNodeProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className={clsx(
        "flex flex-col gap-1",
        props.selected.includes(props.node.id) && "bg-indigo-800",
      )}
      onClick={(event) => {
        event.stopPropagation();
        props.setSelected([props.node.id]);
      }}
    >
      <div className="flex flex-row gap-2 items-center cursor-pointer">
        <Button
          className="p-0! min-w-6! w-6 h-6 border-0!"
          onClick={() => setExpanded(!expanded)}
          disabled={props.node.children.length === 0}
        >
          {expanded ? <MinusSquare /> : <PlusSquare />}
        </Button>
        <div>{props.nodes[props.node.id].label}</div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-1 pl-4">
          {props.node.children.map((treeNode) => (
            <TemplateNode
              key={treeNode.id}
              node={treeNode}
              nodes={props.nodes}
              selected={props.selected}
              setSelected={props.setSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateInstance(props: TemplateNodeProps) {
  return (
    <div
      className={clsx(
        "cursor-pointer",
        props.selected.includes(props.node.id) && "bg-indigo-800",
      )}
      onClick={(event) => {
        event.stopPropagation();
        props.setSelected([props.node.id]);
      }}
    >
      {props.nodes[props.node.id].label}
    </div>
  );
}

function TemplateNode(props: TemplateNodeProps) {
  if (props.node.type === "group") return <TemplateGroup {...props} />;
  if (props.node.type === "instance") return <TemplateInstance {...props} />;
  return null;
}

export default function ManageTemplatesModal() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const treeNode = index[TEMPLATE_ID].treeNode;
  invariant(treeNode.type === "template", "Invalid treeNode type");
  const [selected, setSelected] = React.useState<string[]>([]);

  const reopen = () => dispatch(ModalsActions.openModal("manage-templates"));
  const addGroup = React.useCallback(() => {
    if (selected.length > 1) return;
    const parent = resolveParent(nodes[selected[0]]);
    dispatch(
      NodesActions.createNode({
        type: "group",
        tag: "create",
        parent,
        district: TEMPLATE_ID,
        position: [0, 0, 0],
      }),
    );
    dispatch(NodesActions.selectNode(null));
  }, [selected, nodes, dispatch]);
  const changeLabel = useChangeLabel(nodes[selected[0]]);
  const deleteNode = useDeleteNode(selected);
  const changeParent = useChangeParent(selected);

  return (
    <Modal className="w-[640px]" title="Manage templates">
      <div
        className="flex flex-col gap-1 px-2 py-1 border border-slate-700 min-h-64 max-h-96 overflow-auto"
        onClick={() => setSelected([])}
      >
        {treeNode.children.map((treeNode) => (
          <TemplateNode
            key={treeNode.id}
            node={treeNode}
            nodes={nodes}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </div>
      <div className="flex flex-row justify-between">
        <div className="flex flex-row gap-1">
          <Input
            key={selected[0] ?? "none"}
            type="text"
            className="w-[248px]"
            value={selected.length === 1 ? nodes[selected[0]]?.label : ""}
            onChange={changeLabel}
            readOnly={selected.length !== 1}
          />
          <div className="border-r border-slate-500 h-full" />
          <Button
            onClick={() => changeParent().then(reopen)}
            disabled={selected.length === 0}
          >
            Change parent
          </Button>
        </div>
        <div className="flex flex-row gap-1">
          <Button
            onClick={() => deleteNode().then(reopen)}
            disabled={selected.length === 0}
          >
            <Trash2 />
          </Button>
          <Button onClick={addGroup}>
            <FolderPlus />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
