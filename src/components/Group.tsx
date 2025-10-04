import { CircleDotDashed, SquareMinus, SquarePlus } from "lucide-react";
import * as React from "react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types.ts";
import { clsx } from "../utilities.ts";
import Button from "./Button.tsx";
import Node from "./Node.tsx";

interface GroupProps {
  node: MapNode;
}

function Group({ node }: GroupProps) {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const nodeChildren = React.useMemo(() => {
    const nodeCache = cache[node.id];
    return {
      i: nodeCache.i.flat(99),
      g: nodeCache.g,
    };
  }, [cache, node.id]);
  const [expanded, setExpanded] = React.useState(false);
  const children = React.useMemo(
    () => nodes.filter((child) => child.parent === node.id),
    [nodes, node.id],
  );

  React.useEffect(() => {
    if (
      editing &&
      (nodeChildren.i.some((child) => child === editing.id) ||
        nodeChildren.g.some((child) => child === editing.id)) &&
      !expanded
    ) {
      setExpanded(true);
    }
  }, [nodeChildren, editing, expanded]);

  return (
    <div
      className={clsx(
        "flex flex-col gap-1.5",
        "border-2 border-dotted border-slate-800 p-0.5",
        editing?.id === node.id && "border-slate-100!",
      )}
    >
      <div
        className="flex flex-row items-center gap-2 cursor-pointer"
        tabIndex={-1}
        role="button"
        onClick={(event) => {
          event.stopPropagation();
          dispatch(NodesActions.setEditing(node.id));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            dispatch(NodesActions.setEditing(node.id));
          } else if (event.key === "Escape") {
            dispatch(NodesActions.setEditing(null));
          }
        }}
      >
        <Button
          className="p-0! min-w-6! w-6 h-6 border-0!"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <SquareMinus /> : <SquarePlus />}
        </Button>
        <div className="grow flex flex-row justify-between items-center">
          <span>
            {node.label}{" "}
            <span className="text-gray-400">({nodeChildren.i.length})</span>
          </span>
          {node.pattern?.enabled && (
            <Button
              className="border-none p-0! tooltip"
              data-tooltip="Has pattern"
              data-flow="left"
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
              <CircleDotDashed />
            </Button>
          )}
        </div>
      </div>
      {expanded && children.length > 0 && (
        <div className="pl-8 flex flex-col gap-1.5">
          {children.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Group;
