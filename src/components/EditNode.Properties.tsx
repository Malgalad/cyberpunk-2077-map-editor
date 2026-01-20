import { Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { AXII } from "../constants.ts";
import { useAppSelector } from "../hooks/hooks.ts";
import { useHideNode } from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Toggle from "./common/Toggle.tsx";
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
  const hideNode = useHideNode(selected);

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
  const hiddenSelector = (
    <>
      <div>
        <span className="underline">H</span>idden:
      </div>
      <div>
        <Toggle enabled={node.hidden} onChange={hideNode} />
      </div>
    </>
  );

  if (mode === "delete") {
    return (
      <div className="grow bg-slate-800">
        <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2">
          {node.type === "group" && labelSelector}
          {parentSelector}
          {hiddenSelector}
        </div>
      </div>
    );
  }

  if (isMultiple) {
    return (
      <div className="grow bg-slate-800">
        <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2">
          {parentSelector}
          {hiddenSelector}
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

        {hiddenSelector}
      </div>
    </div>
  );
}

export default EditNodeProperties;
