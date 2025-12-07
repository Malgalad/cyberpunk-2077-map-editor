import { EyeOff, SquareStack, TriangleAlert } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import Tooltip from "./common/Tooltip.tsx";

interface InstanceProps {
  lookAtNode: () => void;
  node: MapNode;
}

function Instance({ lookAtNode, node }: InstanceProps) {
  const dispatch = useAppDispatch();
  const editing = useAppSelector(NodesSelectors.getEditing);

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 border-2 -m-0.5",
        "border-dotted border-transparent cursor-pointer",
        editing?.id === node.id && "border-slate-100!",
      )}
      tabIndex={-1}
      role="button"
      onClick={(event) => {
        event.stopPropagation();
        dispatch(NodesActions.setEditing(node.id));
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        lookAtNode();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          dispatch(NodesActions.setEditing(node.id));
        } else if (event.key === "Escape") {
          dispatch(NodesActions.setEditing(null));
        }
      }}
    >
      <div className="grow flex flex-row justify-between items-center select-none">
        {node.label}
        <div className="flex flex-row gap-1">
          {node.hidden && <EyeOff />}
          {node.pattern?.enabled && (
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
          {node.errors && (
            <Tooltip tooltip={node.errors.join("\n")} flow="left">
              <div>
                <TriangleAlert className="text-red-500" />
              </div>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default Instance;
