import { CheckIcon } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { AXII, PLANES } from "../constants.ts";
import { useAppDispatch } from "../hooks/hooks.ts";
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { NodesActions } from "../store/nodesV2.ts";
import type { Axis, MapNodeV2, Plane, TransformV2 } from "../types/types.ts";
import { clsx, toNumber } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Toggle from "./common/Toggle.tsx";

interface EditNodePatternProps {
  node: MapNodeV2;
}

function EditNodePattern({ node }: EditNodePatternProps) {
  const dispatch = useAppDispatch();
  const invalidate = useInvalidateTransformsCache();
  const hasMirror = node.pattern?.mirror !== null;

  const togglePattern = () => {
    invalidate([node.id]);
    if (node.pattern) {
      dispatch(
        NodesActions.editNode({
          id: node.id,
          pattern: undefined,
        }),
      );
    } else {
      dispatch(
        NodesActions.editNode({
          id: node.id,
          pattern: {
            count: 1,
            mirror: null,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [0, 0, 0],
          },
        }),
      );
    }
  };
  const changeCount = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!node.pattern) return;

    invalidate([node.id]);
    dispatch(
      NodesActions.editNode({
        id: node.id,
        pattern: {
          ...node.pattern,
          count: Math.floor(toNumber(event.target.value)),
        },
      }),
    );
  };
  const changeProperty =
    (property: keyof TransformV2, index: number) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node.pattern || property === "mirror") return;

      invalidate([node.id]);
      dispatch(
        NodesActions.editNode({
          id: node.id,
          pattern: {
            ...node.pattern,
            [property]: node.pattern[property].toSpliced(
              index,
              1,
              property === "rotation"
                ? THREE.MathUtils.degToRad(toNumber(event.target.value))
                : toNumber(event.target.value),
            ),
          },
        }),
      );
    };
  const changeMirror = (plane: Plane) => () => {
    if (!node.pattern) return;

    invalidate([node.id]);
    if (node.pattern.mirror === plane) {
      dispatch(
        NodesActions.editNode({
          id: node.id,
          pattern: { ...node.pattern, mirror: null },
        }),
      );
    } else {
      dispatch(
        NodesActions.editNode({
          id: node.id,
          pattern: {
            count: 1,
            mirror: plane,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [0, 0, 0],
          },
        }),
      );
    }
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
                value={node.pattern.count}
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
                    step={0.1}
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
                    step={0.25}
                    value={THREE.MathUtils.radToDeg(
                      node.pattern!.rotation[axis],
                    )}
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
                    step={0.05}
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
