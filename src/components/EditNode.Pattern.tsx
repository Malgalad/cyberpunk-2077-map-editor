import { CheckIcon } from "lucide-react";
import * as React from "react";

import { AXII, PLANES } from "../constants.ts";
import { useAppDispatch } from "../hooks/hooks.ts";
import { NodesActions } from "../store/nodes.ts";
import type { Axis, MapNode, Plane, Transform } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Toggle from "./common/Toggle.tsx";

interface EditNodePatternProps {
  node: MapNode;
}

function EditNodePattern({ node }: EditNodePatternProps) {
  const dispatch = useAppDispatch();
  const hasMirror = node.pattern?.mirror !== undefined;

  const togglePattern = () => {
    dispatch(
      NodesActions.patchNode(node.id, (draft) => {
        if (draft.pattern) {
          draft.pattern = undefined;
        } else {
          draft.pattern = {
            count: 1,
            position: ["0", "0", "0"],
            rotation: ["0", "0", "0"],
            scale: ["0", "0", "0"],
          };
        }
      }),
    );
  };
  const changeCount = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      NodesActions.patchNode(node.id, (draft) => {
        draft.pattern!.count = parseInt(event.target.value, 10);
      }),
    );
  };
  const changeProperty =
    (property: keyof Transform, index: number) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        NodesActions.patchNode(node.id, (draft) => {
          draft.pattern![property][index] = event.target.value;
        }),
      );
    };
  const changeMirror = (plane: Plane) => () => {
    dispatch(
      NodesActions.patchNode(node.id, (draft) => {
        if (!draft.pattern) return;

        if (draft.pattern.mirror === plane) {
          draft.pattern.mirror = undefined;
        } else {
          draft.pattern.mirror = plane;
          draft.pattern.count = 1;
          draft.pattern.position = ["0", "0", "0"];
          draft.pattern.rotation = ["0", "0", "0"];
          draft.pattern.scale = ["0", "0", "0"];
        }
      }),
    );
  };

  return (
    <div className="grow bg-slate-800">
      <div className="flex flex-col gap-4 p-2">
        <div className="flex flex-row gap-2 items-center">
          <div className="w-[120px]">
            {node.pattern ? "Enabled" : "Disabled"}
          </div>
          <Toggle enabled={!!node.pattern} onChange={togglePattern} />
        </div>

        {node.pattern && (
          <div className="grow grid grid-cols-[120px_auto] items-center gap-2">
            <div>Number of copies:</div>
            <div>
              <DraggableInput
                className="w-16"
                min={1}
                step={1}
                value={node.pattern.count.toString()}
                onChange={changeCount}
                disabled={hasMirror}
              />
            </div>

            <div>Position Δ:</div>
            <div>
              <div className="flex flex-row gap-1 items-center">
                {AXII.map((axis) => (
                  <DraggableInput
                    key={axis}
                    className="w-20"
                    step={0.25}
                    value={node.pattern!.position[axis]}
                    onChange={changeProperty("position", axis)}
                    disabled={hasMirror}
                  />
                ))}
              </div>
            </div>

            <div>Rotation Δ:</div>
            <div>
              <div className="flex flex-row gap-1">
                {AXII.map((axis) => (
                  <DraggableInput
                    key={axis}
                    className="w-20"
                    step={0.5}
                    value={node.pattern!.rotation[axis]}
                    onChange={changeProperty("rotation", axis)}
                    disabled={hasMirror}
                  />
                ))}
              </div>
            </div>

            <div>Scale Δ:</div>
            <div>
              <div className="flex flex-row gap-1 items-center">
                {AXII.map((axis) => (
                  <DraggableInput
                    key={axis}
                    className="w-20"
                    step={0.1}
                    value={node.pattern!.scale[axis]}
                    onChange={changeProperty("scale", axis)}
                    disabled={hasMirror}
                  />
                ))}
              </div>
            </div>

            <div>Mirror:</div>
            <div>
              <div className="flex flex-row gap-1 items-center">
                {PLANES.map((plane) => (
                  <Button
                    key={plane}
                    className={clsx(
                      "w-20",
                      node.pattern!.mirror === plane && "bg-slate-700",
                    )}
                    onClick={changeMirror(plane)}
                  >
                    {node.pattern!.mirror === plane && <CheckIcon />}
                    {renderPlaneName(plane)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const colors: Record<Axis, string> = {
  X: "text-red-500",
  Y: "text-green-500",
  Z: "text-blue-500",
};
function renderPlaneName(plane: Plane) {
  // @ts-expect-error string conversion
  const [a, b]: [Axis, Axis] = plane;
  return (
    <>
      <span className={colors[a]}>{a}</span>
      <span className={colors[b]}>{b}</span>
    </>
  );
}

export default EditNodePattern;
