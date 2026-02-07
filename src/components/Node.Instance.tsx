import { Eye, EyeOff, SquareStack } from "lucide-react";

import { useAppSelector } from "../hooks/hooks.ts";
import {
  useFocusNodeOnSelected,
  useHideNode,
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
  const hideNode = useHideNode([node.id]);

  return (
    <div
      className={clsx("flex flex-row items-center gap-2 cursor-pointer", {
        "bg-indigo-800": selected.includes(node.id),
        "bg-inherit": !selected.includes(node.id),
      })}
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={selectNode}
      onDoubleClick={lookAtNode}
    >
      <div className="grow flex flex-row gap-2 justify-between items-center select-none px-2 py-0.5 bg-inherit">
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
  );
}

export default Instance;
