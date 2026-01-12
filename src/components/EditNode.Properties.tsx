import { Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { AXII } from "../constants.ts";
import {
  useAppDispatch,
  useAppSelector,
  useForceUpdate,
  usePreviousValue,
} from "../hooks/hooks.ts";
import {
  useHideNode,
  useInvalidateTransformsCache,
} from "../hooks/nodes.hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { clsx, toNumber, toTuple3 } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Toggle from "./common/Toggle.tsx";
import Tooltip from "./common/Tooltip.tsx";

interface EditNodePropertiesProps {
  selected: string[];
  mode: "create" | "update" | "delete";
}

const axiiColors = [
  "border-red-500!",
  "border-green-500!",
  "border-blue-500!",
] as const;
const updateTuple = <T,>(tuple: T[], index: number, value: T) =>
  toTuple3(tuple.toSpliced(index, 1, value));

function EditNodeProperties({ selected, mode }: EditNodePropertiesProps) {
  const isMultiple = selected.length > 1;
  const dispatch = useAppDispatch();
  const forceUpdate = useForceUpdate();
  const invalidate = useInvalidateTransformsCache();
  const map3d = useMap3D();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const [useLocal, setUseLocal] = React.useState(false);
  const wasLocal = usePreviousValue(useLocal);
  const [local, setLocal] = React.useState([0, 0, 0]);
  const [copy, setCopy] = React.useState<MapNodeV2["position"]>([0, 0, 0]);
  const node = nodes[selected[0]];

  const onHide = useHideNode(selected);

  React.useEffect(() => {
    if (useLocal && !wasLocal) {
      setCopy(node.position);
      setLocal([0, 0, 0]);
    }
  }, [useLocal, wasLocal, node]);

  React.useEffect(() => {
    if (!map3d) return;

    // Force update so that input step update
    return map3d.onZoomChange(forceUpdate);
  }, [map3d, forceUpdate]);

  const labelSelector = (
    <>
      <div>Label:</div>
      <div>
        <Input
          type="text"
          className="w-[248px]"
          value={node.label}
          onChange={(event) => {
            dispatch(
              NodesActions.editNodes([{ ...node, label: event.target.value }]),
            );
          }}
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
          onClick={() =>
            dispatch(ModalsActions.openModal("update-node-parent"))
          }
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
        <Toggle enabled={node.hidden} onChange={() => onHide()} />
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
              step={3 / (map3d?.camera.zoom ?? 1)}
              value={useLocal ? local[axis] : node.position[axis]}
              onChange={(event) => {
                const value = toNumber(event.target.value);
                invalidate([node.id]);
                if (useLocal) {
                  const newLocal = updateTuple(local, axis, value);

                  setLocal(newLocal);

                  const position = new THREE.Vector3()
                    .fromArray(copy)
                    .add(
                      new THREE.Vector3()
                        .fromArray(newLocal)
                        .applyEuler(new THREE.Euler().fromArray(node.rotation)),
                    );

                  dispatch(
                    NodesActions.editNode({
                      id: node.id,
                      position: toTuple3(position.toArray()),
                    }),
                  );
                } else {
                  dispatch(
                    NodesActions.editNode({
                      id: node.id,
                      position: updateTuple(node.position, axis, value),
                    }),
                  );
                }
              }}
            />
          ))}
        </div>

        <div>Rotation:</div>
        <div className="flex flex-row gap-1">
          {AXII.map((axis) => (
            <DraggableInput
              key={axis}
              className={clsx("w-20", axiiColors[axis])}
              step={5 / (map3d?.camera.zoom ?? 1)}
              value={THREE.MathUtils.radToDeg(node.rotation[axis])}
              onChange={(event) => {
                const value = THREE.MathUtils.degToRad(
                  toNumber(event.target.value),
                );
                invalidate([node.id]);
                dispatch(
                  NodesActions.editNode({
                    id: node.id,
                    rotation: updateTuple(node.rotation, axis, value),
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>{node.type === "group" ? "Scale:" : "Size:"}</div>
        <div className="flex flex-row gap-1 items-center">
          {AXII.map((axis) => (
            <DraggableInput
              key={axis}
              className={clsx("w-20", axiiColors[axis])}
              step={
                node.type === "instance" ? 50 / (map3d?.camera.zoom ?? 1) : 0.1
              }
              value={node.scale[axis]}
              onChange={(event) => {
                const value = toNumber(event.target.value);
                invalidate([node.id]);
                dispatch(
                  NodesActions.editNode({
                    id: node.id,
                    scale: updateTuple(node.scale, axis, value),
                  }),
                );
              }}
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
