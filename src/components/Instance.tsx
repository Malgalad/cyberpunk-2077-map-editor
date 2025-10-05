import { CircleDotDashed } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types.ts";
import { clsx } from "../utilities.ts";
import Button from "./Button.tsx";

interface InstanceProps {
  node: MapNode;
}

function Instance({ node }: InstanceProps) {
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
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          dispatch(NodesActions.setEditing(node.id));
        } else if (event.key === "Escape") {
          dispatch(NodesActions.setEditing(null));
        }
      }}
    >
      <div className="grow flex flex-row justify-between items-center">
        {node.label}
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
  );
}

export default Instance;
