import { Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { useAppDispatch, useAppSelector, usePreviousValue } from "../hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { Districts, MapNode } from "../types.ts";
import { clsx, prepareTransform } from "../utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Select from "./common/Select.tsx";

interface EditNodePropertiesProps {
  node: MapNode;
}

const axii = [0, 1, 2] as const;

function EditNodeProperties({ node }: EditNodePropertiesProps) {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const district = useAppSelector(
    DistrictSelectors.getDistrict,
  ) as keyof Districts;
  const parents = React.useMemo(
    () =>
      [
        { label: "<Root>", value: district },
        ...nodes
          .filter((other) => other.type === "group" && other.id !== node.id)
          .map((other) => ({
            label: other.label,
            value: other.id,
          })),
      ].map((other) => ({
        ...other,
        label: `${other.label}${node.parent === other.value ? " (current)" : ""}`,
        disabled: node.parent === other.value,
      })),
    [district, nodes, node],
  );
  const [useLocal, setUseLocal] = React.useState(false);
  const wasLocal = usePreviousValue(useLocal);
  const [local, setLocal] = React.useState(["0", "0", "0"]);
  const [copy, setCopy] = React.useState<MapNode | null>(null);

  React.useEffect(() => {
    if (useLocal && !wasLocal) {
      setCopy(node);
      setLocal(["0", "0", "0"]);
    }
  }, [useLocal, wasLocal, node]);

  return (
    <div className="grow bg-slate-800">
      <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2 ">
        <div>Label:</div>
        <div>
          <Input
            type="text"
            className="w-[248px]"
            value={node.label}
            onChange={(event) => {
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.label = event.target.value;
                }),
              );
            }}
          />
        </div>
        <div>Parent:</div>
        <div>
          <Select
            className="w-[248px]"
            items={parents}
            onChange={(event) => {
              // TODO calc new position so box stays in place despite parent transforms
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.parent = event.target.value;
                }),
              );
            }}
            value={node.parent}
          />
        </div>
        <div>
          <Button
            className={clsx(
              "border-none px-0 tooltip",
              useLocal && "text-amber-300",
            )}
            data-tooltip={
              useLocal ? "Use local position" : "Use global position"
            }
            data-flow="right"
            onClick={() => setUseLocal(!useLocal)}
          >
            <span>Position:</span>
            <Move3D />
          </Button>
        </div>
        <div className="flex flex-row gap-1 items-center">
          {axii.map((i) => (
            <DraggableInput
              key={i}
              className="w-20"
              step={0.25}
              value={useLocal ? local[i] : node.position[i]}
              onChange={(value) => {
                if (useLocal) {
                  const newLocal = local.toSpliced(i, 1, value);

                  setLocal(newLocal);

                  if (!copy) return;

                  const parsedNode = prepareTransform(copy);
                  const parsedLocalPosition = prepareTransform({
                    position: newLocal as [string, string, string],
                    rotation: ["0", "0", "0"],
                    scale: ["1", "1", "1"],
                  });

                  const position = new THREE.Vector3()
                    .fromArray(parsedNode.position)
                    .add(
                      new THREE.Vector3()
                        .fromArray(parsedLocalPosition.position)
                        .applyEuler(
                          new THREE.Euler().fromArray(parsedNode.rotation),
                        ),
                    );

                  dispatch(
                    NodesActions.patchNode((draft) => {
                      draft.position = position
                        .toArray()
                        .map((number) => number.toString()) as [
                        string,
                        string,
                        string,
                      ];
                    }),
                  );
                } else {
                  dispatch(
                    NodesActions.patchNode((draft) => {
                      draft.position[i] = value;
                    }),
                  );
                }
              }}
            />
          ))}
        </div>
        <div>Rotation:</div>
        <div className="flex flex-row gap-1">
          {axii.map((i) => (
            <DraggableInput
              key={i}
              className="w-20"
              step={0.5}
              value={node.rotation[i]}
              onChange={(value) => {
                dispatch(
                  NodesActions.patchNode((draft) => {
                    draft.rotation[i] = value;
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>Scale:</div>
        <div className="flex flex-row gap-1 items-center">
          {axii.map((i) => (
            <DraggableInput
              key={i}
              className="w-20"
              step={node.type === "instance" ? 2 : 0.1}
              value={node.scale[i]}
              onChange={(value) => {
                dispatch(
                  NodesActions.patchNode((draft) => {
                    draft.scale[i] = value;
                  }),
                );
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EditNodeProperties;
