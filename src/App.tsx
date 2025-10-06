import { BoxIcon } from "lucide-react";
import * as React from "react";

import Button from "./components/common/Button.tsx";
import { useAppDispatch, useAppSelector, useSyncNodes } from "./hooks.ts";
import { Map3D } from "./map3d/map3d.ts";
import { getDistrictInstancedMeshTransforms } from "./store/district.selectors.ts";
import { DistrictSelectors } from "./store/district.ts";
import { ModalsActions } from "./store/modals.ts";
import { getNodesInstancedMeshTransforms } from "./store/nodes.selectors.ts";
import { NodesActions, NodesSelectors } from "./store/nodes.ts";
import AddNodes from "./tabs/AddNodes.tsx";
import Menu from "./tabs/Menu.tsx";
import RemoveNodes from "./tabs/RemoveNodes.tsx";
import { clsx } from "./utilities.ts";

type Tabs = "add" | "remove";
const tabs = [
  { key: "add", label: "Add nodes" },
  { key: "remove", label: "Remove nodes" },
] as { key: Tabs; label: string }[];

function App() {
  const dispatch = useAppDispatch();

  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districtData = useAppSelector(DistrictSelectors.getDistrictData);
  const districtInstancedMeshTransforms = useAppSelector(
    getDistrictInstancedMeshTransforms,
  );

  const nodes = useAppSelector(NodesSelectors.getNodes);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );
  const removals = useAppSelector(NodesSelectors.getRemovals);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [map3D, setMap3D] = React.useState<Map3D | null>(null);
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
      dispatch(ModalsActions.openModal("select-district"));
    } else {
      dispatch(NodesActions.setEditing(null));
    }
  }, [district, dispatch]);

  // Draw buildings on district change and set mesh state
  React.useEffect(() => {
    if (!map3D || !districtData) return;
    map3D.setBuildingsData(districtData, districtInstancedMeshTransforms);
  }, [districtData, map3D, districtInstancedMeshTransforms]);

  // Draw nodes on instanceTransforms change
  React.useEffect(() => {
    if (!map3D || !districtData) return;
    map3D.setEditsData(districtData, nodesInstancedMeshTransforms);
  }, [districtData, map3D, nodesInstancedMeshTransforms]);

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
    const indexes = nodesInstancedMeshTransforms.reduce(
      (acc, transform, index) => {
        if (selectedIds.has(transform.id)) {
          acc.push(index);
        }
        return acc;
      },
      [] as number[],
    );

    map3D.selectEditsData(indexes);
  }, [editing, cache, nodesInstancedMeshTransforms, map3D]);

  // Listen to map events and select nodes on click
  React.useEffect(() => {
    if (!map3D || !nodesInstancedMeshTransforms.length) return;

    const onSelect = ((event: CustomEvent<{ index: number }>) => {
      if (event.detail) {
        const index = event.detail.index;
        if (index != null) {
          const id = nodesInstancedMeshTransforms[index].id;

          if (id) {
            dispatch(NodesActions.setEditing(id));
          }
        } else {
          dispatch(NodesActions.setEditing(null));
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
  }, [map3D, dispatch, nodesInstancedMeshTransforms]);

  // Set map mode to change raycast behavior on mousemove
  React.useEffect(() => {
    if (!map3D) return;
    map3D.setMode(tab === "add" ? "add" : "remove");
    dispatch(NodesActions.setEditing(null));
  }, [map3D, tab, dispatch]);

  return (
    <div className="flex flex-row gap-2 w-screen h-screen bg-slate-900 text-white">
      <div className="grow flex flex-col gap-2">
        <Menu />

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
        <div className="flex flex-col flex-grow gap-2 p-2 border border-slate-500">
          {tab === "add" && <AddNodes />}
          {tab === "remove" && <RemoveNodes map3D={map3D} />}
        </div>
      </div>
    </div>
  );
}

export default App;
