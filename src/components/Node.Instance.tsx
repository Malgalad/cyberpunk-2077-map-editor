import { EyeOff, SquareStack } from "lucide-react";

import { useAppSelector } from "../hooks/hooks.ts";
import {
  useFocusNodeOnSelected,
  useLookAtNode,
  useSelectNode,
} from "../hooks/nodes.hooks.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import Tooltip from "./common/Tooltip.tsx";

interface InstanceProps {
  node: MapNodeV2;
}

function Instance({ node }: InstanceProps) {
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);

  const ref = useFocusNodeOnSelected(node);
  const lookAtNode = useLookAtNode(node);
  const selectNode = useSelectNode(node);

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 border-2",
        "border-dotted border-transparent cursor-pointer",
        selected.includes(node.id) && "border-slate-100!",
      )}
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={selectNode}
      onDoubleClick={lookAtNode}
    >
      <div className="grow flex flex-row gap-2 justify-between items-center select-none px-2 py-0.5  bg-slate-800">
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
