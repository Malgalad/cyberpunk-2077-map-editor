import { EyeOff, SquareMinus, SquarePlus, SquareStack } from "lucide-react";
import * as React from "react";

import { MAX_DEPTH } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useFocusNode } from "../hooks/nodes.hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import Tooltip from "./common/Tooltip.tsx";
import Node from "./Node.tsx";

interface GroupProps {
  lookAtNode: () => void;
  node: MapNodeV2;
}

function Group({ lookAtNode, node }: GroupProps) {
  const dispatch = useAppDispatch();

  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const [expanded, setExpanded] = React.useState(false);
  const treeNode = index[node.id].treeNode;
  const children = treeNode.type === "group" ? treeNode.children : [];
  const depth = treeNode.type === "group" ? treeNode.depth : 0;
  const descendantIds = index[node.id].descendantIds;
  const ref = useFocusNode(node);

  React.useEffect(() => {
    if (
      selected.length > 0 &&
      descendantIds.some((id) => selected.includes(id)) &&
      !expanded
    ) {
      setExpanded(true);
    }
  }, [descendantIds, selected, expanded]);

  return (
    <div
      className={clsx(
        "flex flex-col gap-1.5",
        "border-2 border-dotted border-transparent",
        selected.includes(node.id) && "border-slate-100!",
      )}
    >
      <div
        className="flex flex-row items-center gap-2 px-2 py-0.5 cursor-pointer sticky bg-slate-800"
        style={{ top: depth * 28, zIndex: 10 * (MAX_DEPTH - depth) }}
        ref={ref}
        role="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          const modifier = event.getModifierState("Control")
            ? "ctrl"
            : event.getModifierState("Shift")
              ? "shift"
              : undefined;
          dispatch(NodesActions.selectNode({ id: node.id, modifier }));
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          lookAtNode();
        }}
      >
        <Button
          className="p-0! min-w-6! w-6 h-6 border-0!"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <SquareMinus /> : <SquarePlus />}
        </Button>
        <div className="grow flex flex-row justify-between items-center select-none">
          <span>
            {node.label}{" "}
            <span className="text-gray-400">
              ({treeNode.type === "group" ? treeNode.weight : 0})
            </span>
          </span>
          <div className="flex flex-row gap-1">
            {node.hidden && <EyeOff />}
            {node.pattern && (
              <Tooltip tooltip="Has pattern" flow="left">
                <Button
                  className="border-none p-0!"
                  onClick={() => {
                    setTimeout(() => {
                      window.dispatchEvent(
                        new CustomEvent("set-editing-tab", {
                          detail: { tab: "pattern" },
                        }),
                      );
                    });
                  }}
                >
                  <SquareStack />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className="pl-8 flex flex-col">
          {children.map((treeNode) => (
            <Node key={treeNode.id} node={nodes[treeNode.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Group;
