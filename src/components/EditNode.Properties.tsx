import { Move3D } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import {
  useAppDispatch,
  useAppSelector,
  useForceUpdate,
  useGlobalShortcuts,
  usePreviousValue,
} from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getDistrictNodes } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type {
  DistrictProperties,
  GroupNodeCache,
  MapNode,
  Modes,
} from "../types/types.ts";
import type { SelectItem } from "../types/ui.types.ts";
import { getDistrictName } from "../utilities/district.ts";
import { parseNode, transplantNode } from "../utilities/nodes.ts";
import { parseTransform } from "../utilities/transforms.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";
import Input from "./common/Input.tsx";
import Select from "./common/Select.tsx";
import Toggle from "./common/Toggle.tsx";
import Tooltip from "./common/Tooltip.tsx";

interface EditNodePropertiesProps {
  selected: MapNode[];
  mode: "create" | "update" | "delete";
}

const axii = [0, 1, 2] as const;
const axiiColors = [
  "border-red-500!",
  "border-green-500!",
  "border-blue-500!",
] as const;

function EditNodeProperties({ selected, mode }: EditNodePropertiesProps) {
  const [node] = selected;
  const isMultiple = selected.length > 1;
  const dispatch = useAppDispatch();
  const forceUpdate = useForceUpdate();
  const map3d = useMap3D();
  const nodes = useAppSelector(getDistrictNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const parents = React.useMemo(
    () => getParentsList(selected, nodes, district, districts, cache, mode),
    [district, districts, nodes, selected, cache, mode],
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

  const onHide = () => {
    if (selected.length === 0) return;
    for (const node of selected) {
      dispatch(
        NodesActions.patchNode(node.id, (draft) => {
          draft.hidden = !draft.hidden;
        }),
      );
    }
  };

  useGlobalShortcuts("KeyH", onHide);

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
              NodesActions.patchNode(node.id, (draft) => {
                draft.label = event.target.value;
              }),
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
        {/* TODO split parent nodes and district select */}
        <Select
          className="w-[248px]"
          disabled={
            !selected.every((node) => node.parent === selected[0].parent)
          }
          items={parents}
          onChange={(event) => {
            const parent = event.target.value;
            const map = new Map(
              nodes.map((node) => [node.id, parseNode(node)]),
            );
            for (const node of selected) {
              const twig = transplantNode(map, node, parent);

              dispatch(
                NodesActions.patchNode(node.id, (draft) => {
                  draft.parent = twig.parent;
                  draft.position = twig.position;
                  draft.rotation = twig.rotation;
                  draft.scale = twig.scale;
                }),
              );
            }
          }}
          value={node.parent}
        />
      </div>
    </>
  );
  const hiddenSelector = (
    <>
      <div>
        <span className="underline">H</span>idden:
      </div>
      <div>
        <Toggle enabled={!!node.hidden} onChange={() => onHide()} />
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

                  // FIXME use new rotation when changing angle while local transform is used
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
                    NodesActions.patchNode(node.id, (draft) => {
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
                    NodesActions.patchNode(node.id, (draft) => {
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
              step={5 / (map3d?.camera.zoom ?? 1)}
              value={node.rotation[i]}
              onChange={(event) => {
                dispatch(
                  NodesActions.patchNode(node.id, (draft) => {
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
                  NodesActions.patchNode(node.id, (draft) => {
                    draft.scale[i] = event.target.value;
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

const emptyArr: unknown[] = [];

function getParentsList(
  selectedNodes: MapNode[],
  nodes: MapNode[],
  selectedDistrict: DistrictProperties | undefined,
  districts: DistrictProperties[],
  cache: GroupNodeCache,
  mode: Modes,
): SelectItem[] {
  if (!selectedDistrict) return emptyArr as SelectItem[];

  const { tag, parent } = selectedNodes[0];
  const excludedGroups = new Set(
    selectedNodes.reduce(
      (acc, node) => acc.concat(cache[node.id]?.groups ?? []),
      [] as string[],
    ),
  );
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const items: SelectItem[] = [];
  const wrapLabel = (label: string, value: string) =>
    [
      label,
      parent === value && " (current)",
      selectedIds.has(value) && " (self)",
    ]
      .filter(Boolean)
      .join(" ");

  const addItem = (node: MapNode, parentId: string, level: number) => {
    if (excludedGroups.has(node.id)) return;
    if (node.parent === parentId && node.tag === tag && node.type === "group") {
      items.push({
        disabled: parent === node.id || selectedIds.has(node.id),
        label: wrapLabel(node.label, node.id),
        level,
        value: node.id,
      });

      for (const child of nodes) {
        addItem(child, node.id, level + 1);
      }
    }
  };

  for (const district of districts) {
    if (mode !== "create" && district.name !== selectedDistrict.name) continue;

    items.push({
      disabled: parent === district.name,
      label: wrapLabel(getDistrictName(district), district.name),
      level: 0,
      value: district.name,
    });

    for (const node of nodes) {
      addItem(node, district.name, 1);
    }
  }

  return items;
}

export default EditNodeProperties;
