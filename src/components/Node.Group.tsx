import {
  Eye,
  EyeOff,
  SquareMinus,
  SquarePlus,
  SquareStack,
} from "lucide-react";
import * as React from "react";

import { MAX_DEPTH } from "../constants.ts";
import { useAppSelector } from "../hooks/hooks.ts";
import {
  useFocusNodeOnSelected,
  useHideNode,
  useLookAtNode,
  useSelectNode,
} from "../hooks/nodes.hooks.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { clsx, invariant } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import Tooltip from "./common/Tooltip.tsx";
import Node from "./Node.tsx";

interface GroupProps {
  node: MapNodeV2;
}
const ROW_HEIGHT = 28;

function Group({ node }: GroupProps) {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const index = useAppSelector(NodesSelectors.getNodesIndex);

  const [expanded, setExpanded] = React.useState(false);

  const treeNode = index[node.id].treeNode;
  invariant(
    treeNode.type === "group",
    "Invalid treeNode type, expected 'group'",
  );
  const { children, depth } = treeNode;
  const descendantIds = index[node.id].descendantIds;

  const ref = useFocusNodeOnSelected(node);
  const lookAtNode = useLookAtNode(node);
  const selectNode = useSelectNode(node);
  const hideNode = useHideNode([node.id]);

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
      className={clsx("flex flex-col", {
        "bg-indigo-800": selected.includes(node.id),
        "bg-inherit": !selected.includes(node.id),
      })}
    >
      <div
        className="flex flex-row items-center gap-2 px-2 py-0.5 cursor-pointer sticky bg-inherit"
        style={{ top: depth * ROW_HEIGHT, zIndex: 10 * (MAX_DEPTH - depth) }}
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={selectNode}
        onDoubleClick={lookAtNode}
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
            {node.pattern && (
              <Tooltip tooltip="Has pattern" flow="left">
                <Button
                  className="border-none p-0! opacity-50 hover:opacity-100"
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

            <Tooltip tooltip={node.hidden ? "Show" : "Hide"} flow="left">
              <Button
                className="border-none p-0! opacity-50 hover:opacity-100"
                onClick={hideNode}
              >
                {node.hidden ? <EyeOff /> : <Eye />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className="pl-8 flex flex-col bg-inherit">
          {children.map((treeNode) => (
            <Node key={treeNode.id} node={nodes[treeNode.id]} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Group;
