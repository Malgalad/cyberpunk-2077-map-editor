import { EyeOff, SquareStack } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useFocusNode } from "../hooks/nodes.hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import Tooltip from "./common/Tooltip.tsx";

interface InstanceProps {
  lookAtNode: () => void;
  node: MapNodeV2;
}

function Instance({ lookAtNode, node }: InstanceProps) {
  const dispatch = useAppDispatch();
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const ref = useFocusNode(node);

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 border-2 -m-0.5",
        "border-dotted border-transparent cursor-pointer",
        selected.includes(node.id) && "border-slate-100!",
      )}
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
      <div className="grow flex flex-row justify-between items-center select-none">
        <span>
          {node.label}
          {node.pattern && (
            <>
              {" "}
              <span className="text-gray-400">(×{node.pattern.count})</span>
            </>
          )}
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
  );
}

export default Instance;
