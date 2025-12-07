import { Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import {
  useAppDispatch,
  useAppSelector,
  useForceUpdate,
  usePreviousValue,
} from "../hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getDistrictNodes } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type {
  DistrictProperties,
  GroupNodeCache,
  MapNode,
} from "../types/types.ts";
import type { SelectItem } from "../types/ui.types.ts";
import { getDistrictName } from "../utilities/district.ts";
import { parseNode } from "../utilities/nodes.ts";
import { applyTransforms, parseTransform } from "../utilities/transforms.ts";
import { clsx, toNumber, toString } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Select from "./common/Select.tsx";
import Toggle from "./common/Toggle.tsx";

interface EditNodePropertiesProps {
  node: MapNode;
}

const axii = [0, 1, 2] as const;
const axiiColors = [
  "border-red-500!",
  "border-green-500!",
  "border-blue-500!",
] as const;

function EditNodeProperties({ node }: EditNodePropertiesProps) {
  const dispatch = useAppDispatch();
  const forceUpdate = useForceUpdate();
  const map3d = useMap3D();
  const nodes = useAppSelector(getDistrictNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const parents = React.useMemo(
    () => getParentsList(node, nodes, district, districts, cache),
    [district, districts, nodes, node, cache],
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

  React.useEffect(() => {
    if (!map3d) return;

    return map3d.onZoomChange(forceUpdate);
  }, [map3d, forceUpdate]);

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
          {/* TODO split parent nodes and district select */}
          <Select
            className="w-[248px]"
            items={parents}
            onChange={(event) => {
              const parentId = event.target.value;
              const map = new Map(
                nodes.map((node) => [node.id, parseNode(node)]),
              );
              const { position: oldPosition } = applyTransforms(
                parseNode(node),
                map,
              );
              const { position: newPosition } = applyTransforms(
                parseNode({
                  ...node,
                  parent: parentId,
                }),
                map,
              );
              const difference = [
                newPosition[0] - oldPosition[0],
                newPosition[1] - oldPosition[1],
                newPosition[2] - oldPosition[2],
              ];
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.parent = parentId;
                  draft.position = [
                    toString(toNumber(draft.position[0]) - difference[0]),
                    toString(toNumber(draft.position[1]) - difference[1]),
                    toString(toNumber(draft.position[2]) - difference[2]),
                  ];
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
              className={clsx("w-20", axiiColors[i])}
              step={3 / (map3d?.camera.zoom ?? 1)}
              value={useLocal ? local[i] : node.position[i]}
              onChange={(event) => {
                if (useLocal) {
                  const newLocal = local.toSpliced(i, 1, event.target.value);

                  setLocal(newLocal);

                  if (!copy) return;

                  const parsedNode = parseTransform(copy);
                  const parsedLocalPosition = parseTransform({
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
                      draft.position[i] = event.target.value;
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
              className={clsx("w-20", axiiColors[i])}
              step={1.5 / (map3d?.camera.zoom ?? 1)}
              value={node.rotation[i]}
              onChange={(event) => {
                dispatch(
                  NodesActions.patchNode((draft) => {
                    draft.rotation[i] = event.target.value;
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>{node.type === "group" ? "Scale:" : "Size:"}</div>
        <div className="flex flex-row gap-1 items-center">
          {axii.map((i) => (
            <DraggableInput
              key={i}
              className={clsx("w-20", axiiColors[i])}
              step={
                node.type === "instance" ? 50 / (map3d?.camera.zoom ?? 1) : 0.1
              }
              value={node.scale[i]}
              onChange={(event) => {
                dispatch(
                  NodesActions.patchNode((draft) => {
                    draft.scale[i] = event.target.value;
                  }),
                );
              }}
              min={0}
              max={node.type === "instance" ? district?.cubeSize : 100}
            />
          ))}
        </div>
        <div
          className="tooltip"
          data-tooltip="Visually hide this node and children"
          data-flow="top"
        >
          Hidden:
        </div>
        <div>
          <Toggle
            enabled={!!node.hidden}
            onChange={(enabled) => {
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.hidden = enabled;
                }),
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

const emptyArr: unknown[] = [];

function getParentsList(
  node: MapNode,
  nodes: MapNode[],
  district: DistrictProperties | undefined,
  districts: DistrictProperties[],
  cache: GroupNodeCache,
): SelectItem[] {
  if (!district) return emptyArr as SelectItem[];

  const items = districts.map((district) => ({
    label: getDistrictName(district),
    value: district.name,
  }));

  items.splice(
    items.findIndex((item) => item.value === district.name) + 1,
    0,
    ...nodes
      .filter((node) => node.type === "group")
      .map((group) => ({
        label: group.label,
        value: group.id,
      })),
  );

  return items
    .filter((item) => !cache[node.id]?.groups.includes(item.value))
    .map((item) => ({
      disabled: node.parent === item.value || node.id === item.value,
      label: `${item.label}${node.parent === item.value ? " (current)" : node.id === item.value ? " (self)" : ""}`,
      level: cache[item.value]?.level ?? 0,
      value: item.value,
    }));
}

export default EditNodeProperties;
