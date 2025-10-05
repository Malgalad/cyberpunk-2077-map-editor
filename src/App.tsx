import { BoxIcon } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import Button from "./components/Button.tsx";
import { exportData, importData } from "./helpers.ts";
import { useAppDispatch, useAppSelector, useSyncNodes } from "./hooks.ts";
import type { InstanceTransforms } from "./map3d/importDDS.ts";
import { Map3D } from "./map3d/map3d.ts";
import mapData from "./mapData.min.json";
import { Actions, Selectors } from "./store/globals.ts";
import { ModalsActions } from "./store/modals.ts";
import { NodesActions, NodesSelectors } from "./store/nodes.ts";
import AddNodes from "./tabs/AddNodes.tsx";
import RemoveNodes from "./tabs/RemoveNodes.tsx";
import type { MapNodeParsed } from "./types.ts";
import {
  applyParentTransform,
  cloneNode,
  clsx,
  hadamardSum,
  nodeToTransform,
  prepareNode,
} from "./utilities.ts";

type Tabs = "add" | "remove";
const tabs = [
  { key: "add", label: "Add nodes" },
  { key: "remove", label: "Remove nodes" },
] as { key: Tabs; label: string }[];

const scalePattern = (i: number) => (value: number) => value * (i + 1);

function App() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(Selectors.getDistrict);
  const districtData = useAppSelector(Selectors.getDistrictData);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const removals = useAppSelector(NodesSelectors.getRemovals);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [map3D, setMap3D] = React.useState<Map3D | null>(null);
  const [instanceTransforms, setInstanceTransforms] = React.useState<
    InstanceTransforms[]
  >([]);
  const [tab, setTab] = React.useState<Tabs>("add");
  useSyncNodes(nodes, removals, district);

  // Init map and set Map3D state
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const map = new Map3D(canvasRef.current);

    setMap3D(map);

    return () => {
      map.dispose();
    };
  }, []);

  // open Select District modal on launch
  React.useEffect(() => {
    if (district === undefined) {
      dispatch(ModalsActions.openModal("select-district")).then((choice) => {
        dispatch(Actions.setDistrict(choice));
      });
    } else {
      dispatch(NodesActions.setEditing(null));
    }
  }, [district, dispatch]);

  // Draw buildings on district change and set mesh state
  React.useEffect(() => {
    if (!map3D || !district) return;
    map3D.setBuildingsData(mapData.soup[district], removals);
  }, [district, map3D, removals]);

  // Reduce nodes to instanced mesh transforms and set instanceTransforms state
  React.useEffect(() => {
    if (!map3D || !districtData || !district) return;

    const instanceTransforms: InstanceTransforms[] = [];
    const virtualTransforms: InstanceTransforms[] = [];
    const reversedNodes: MapNodeParsed[] = nodes.toReversed().map(prepareNode);
    const { origin, minMax, cubeSize } = districtData;

    for (const node of reversedNodes) {
      if (!node.pattern?.enabled) continue;

      for (let i = 0; i < node.pattern.count; i++) {
        const virtualNodes = cloneNode(reversedNodes, node, node.parent, {
          cloneLabel: false,
        });

        for (const clone of virtualNodes) {
          clone.virtual = true;
        }

        const position = hadamardSum(
          virtualNodes[0].position,
          node.pattern.position.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        const rotation = hadamardSum(
          virtualNodes[0].rotation,
          node.pattern.rotation.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        const scale = hadamardSum(
          virtualNodes[0].scale,
          node.pattern.scale.map(scalePattern(i)),
        ) as THREE.Vector3Tuple;

        virtualNodes.splice(0, 1, {
          ...virtualNodes[0],
          pattern: undefined,
          position,
          rotation,
          scale,
        });

        reversedNodes.push(...virtualNodes);
      }
    }

    for (const node of reversedNodes) {
      if (node.type === "instance") {
        let current = node;
        let parentId = current.parent;

        while (parentId !== district) {
          const parent = reversedNodes.find((parent) => parent.id === parentId);
          if (!parent) break;
          current = applyParentTransform(current, parent);
          parentId = parent.parent;
        }

        current.position[2] += current.scale[2] / 2;

        const transformedNode = nodeToTransform(
          current,
          origin,
          minMax,
          cubeSize,
        );

        if (current.virtual) {
          virtualTransforms.push(transformedNode);
        } else {
          instanceTransforms.push(transformedNode);
        }
      }
    }

    map3D.setVirtualEditsData(mapData.soup[district], virtualTransforms);
    setInstanceTransforms(instanceTransforms);
  }, [nodes, district, districtData, map3D]);

  // Draw nodes on instanceTransforms change
  React.useEffect(() => {
    if (!map3D || !district) return;
    map3D.setEditsData(mapData.soup[district], instanceTransforms);
  }, [district, instanceTransforms, map3D]);

  // Highlight nodes on editing change
  React.useEffect(() => {
    if (!map3D) return;

    if (!editing) {
      map3D.selectEditsData([]);
      return;
    }

    const selectedIds = new Set(
      editing.type === "instance" ? [editing.id] : cache[editing.id].i.flat(99),
    );
    const indexes = instanceTransforms.reduce((acc, transform, index) => {
      if (selectedIds.has(transform.id)) {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);

    map3D.selectEditsData(indexes);
  }, [editing, cache, instanceTransforms, map3D]);

  // Listen to map events and select nodes on click
  React.useEffect(() => {
    if (!map3D || !instanceTransforms.length) return;

    const onSelect = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const index = event.detail.index;
        const id = instanceTransforms[index].id;

        if (id) {
          dispatch(NodesActions.setEditing(id));
        }
      }
    }) as EventListener;
    const onRemove = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const index = event.detail.index;

        if (index != null) {
          dispatch(NodesActions.excludeTransform(index));
        }
      }
    }) as EventListener;

    window.addEventListener("select-node", onSelect);
    window.addEventListener("remove-node", onRemove);

    return () => {
      window.removeEventListener("select-node", onSelect);
      window.removeEventListener("remove-node", onRemove);
    };
  }, [map3D, dispatch, instanceTransforms]);

  // Set map mode to change raycast behavior on mousemove
  React.useEffect(() => {
    if (!map3D) return;
    map3D.setMode(tab === "add" ? "add" : "remove");
  }, [map3D, tab]);

  return (
    <div className="flex flex-row gap-2 w-screen h-screen bg-slate-900 text-white">
      <div className="grow flex flex-col gap-2">
        <div className="flex flex-row gap-2 px-2">
          <Button
            className="border-none"
            onClick={() => {
              dispatch(ModalsActions.openModal("select-district")).then(
                (choice) => {
                  dispatch(Actions.setDistrict(choice));
                },
              );
            }}
          >
            Select district
          </Button>
          <Button
            className="border-none tooltip"
            onClick={() => importData(dispatch, district)}
            data-tooltip="Import from JSON file"
            data-flow="bottom"
          >
            Import
          </Button>
          <Button
            className="border-none tooltip"
            onClick={() => exportData(nodes, removals, district)}
            data-tooltip="Export to JSON file"
            data-flow="bottom"
          >
            Export
          </Button>
        </div>
        <div className="grow relative">
          <canvas className="w-full h-full block" ref={canvasRef} />
          <Button
            className="absolute! bg-slate-800 left-4 top-4 tooltip"
            onClick={() => {
              map3D?.resetCamera();
            }}
            data-tooltip="Reset camera"
            data-flow="right"
          >
            <BoxIcon />
          </Button>
        </div>
      </div>
      <div className="w-[420px] flex flex-col py-2 pr-2 overflow-y-auto">
        <div className="flex flex-row gap-0.5 -mb-[1px]">
          {tabs.map((button) => (
            <Button
              key={button.key}
              className={clsx(
                "w-1/2 z-10",
                button.key === tab && "border-b-slate-900",
                button.key !== tab && "border-transparent",
              )}
              onClick={() => setTab(button.key)}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col flex-grow gap-2 p-2 border border-slate-600">
          {tab === "add" && <AddNodes />}
          {tab === "remove" && <RemoveNodes />}
        </div>
      </div>
    </div>
  );
}

export default App;
