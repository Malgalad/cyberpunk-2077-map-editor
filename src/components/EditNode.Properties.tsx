import { CheckIcon, Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { AXII, PLANES } from "../constants.ts";
import { useAppSelector } from "../hooks/hooks.ts";
import { useMirrorNode } from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import type { Axis, Plane } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Tooltip from "./common/Tooltip.tsx";
import {
  useChangeLabel,
  useChangeParent,
  useChangePosition,
  useChangeRotation,
  useChangeScale,
} from "./EditNode.Properties.hooks.ts";

interface EditNodePropertiesProps {
  selected: string[];
  mode: "create" | "update" | "delete";
}

const axiiColors = [
  "border-red-500!",
  "border-green-500!",
  "border-blue-500!",
] as const;

function EditNodeProperties({ selected, mode }: EditNodePropertiesProps) {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const [useLocal, setUseLocal] = React.useState(false);
  const node = nodes[selected[0]];
  const isMultiple = selected.length > 1;

  const changeLabel = useChangeLabel(node);
  const changeParent = useChangeParent();
  const [position, changePosition] = useChangePosition(node, useLocal);
  const changeRotation = useChangeRotation(node);
  const changeScale = useChangeScale(node);
  const changeMirror = useMirrorNode(node);

  const labelSelector = (
    <>
      <div>Label:</div>
      <div>
        <Input
          type="text"
          className="w-[248px]"
          value={node.label}
          onChange={changeLabel}
        />
      </div>
    </>
  );
  const parentSelector = (
    <>
      <div>Parent:</div>
      <div>
        <Button
          className="w-[248px]"
          disabled={
            !selected.every(
              (id) => nodes[id].parent === nodes[selected[0]].parent,
            )
          }
          onClick={changeParent}
        >
          Change parent
        </Button>
      </div>
    </>
  );

  if (mode === "delete") {
    return (
      <div className="grow bg-slate-800">
        <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2">
          {node.type === "group" && labelSelector}
          {parentSelector}
        </div>
      </div>
    );
  }

  if (isMultiple) {
    return (
      <div className="grow bg-slate-800">
        <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2">
          {parentSelector}
        </div>
      </div>
    );
  }

  return (
    <div className="grow bg-slate-800">
      <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2">
        {labelSelector}
        {parentSelector}

        <div>
          <Tooltip
            tooltip={
              useLocal
                ? "Currently changing position relative to own rotation. Toggle after changing angle."
                : "Currently changing position relative to parent rotation"
            }
          >
            <Button
              className={clsx("border-none px-0", useLocal && "text-amber-300")}
              onClick={() => setUseLocal(!useLocal)}
            >
              <span>Position:</span>
              <Move3D />
            </Button>
          </Tooltip>
        </div>

        <div className="flex flex-row gap-1 items-center">
          {AXII.map((axis) => (
            <DraggableInput
              key={`${axis}+${useLocal}`}
              className={clsx("w-20", axiiColors[axis])}
              step={0.1}
              value={position[axis]}
              onChange={changePosition(axis)}
            />
          ))}
        </div>

        <div>Rotation:</div>
        <div className="flex flex-row gap-1">
          {AXII.map((axis) => (
            <DraggableInput
              key={axis}
              className={clsx("w-20", axiiColors[axis])}
              step={0.25}
              value={THREE.MathUtils.radToDeg(node.rotation[axis])}
              onChange={changeRotation(axis)}
            />
          ))}
        </div>
        <div>{node.type === "group" ? "Scale:" : "Size:"}</div>
        <div className="flex flex-row gap-1 items-center">
          {AXII.map((axis) => (
            <DraggableInput
              key={axis}
              className={clsx("w-20", axiiColors[axis])}
              step={0.05}
              value={node.scale[axis]}
              onChange={changeScale(axis)}
              min={0}
              max={
                node.type === "instance" ? (district?.cubeSize ?? 0) * 2 : 100
              }
            />
          ))}
        </div>

        <div>Mirror:</div>
        <div>
          <div className="flex flex-row gap-1 items-center">
            {PLANES.map((plane) => (
              <Button
                key={plane}
                className={clsx(
                  "w-20",
                  node.mirror === plane && "bg-slate-700",
                )}
                onClick={() => changeMirror(plane)}
              >
                {node.mirror === plane && <CheckIcon />}
                {renderPlaneName(plane)}
              </Button>
            ))}
          </div>
        </div>
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

export default EditNodeProperties;
