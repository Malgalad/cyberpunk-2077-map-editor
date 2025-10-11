import { BoxIcon } from "lucide-react";
import * as React from "react";

import {
  useDrawAdditions,
  useDrawCurrentDistrict,
  useInitMap3D,
  useMap3DEvents,
} from "./App.hooks.ts";
import Button from "./components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "./hooks.ts";
import { Map3DContext } from "./map3d/map3d.context.ts";
import { DistrictSelectors } from "./store/district.ts";
import { ModalsActions } from "./store/modals.ts";
import { NodesActions } from "./store/nodes.ts";
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

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const map3d = useInitMap3D(canvasRef);
  const [tab, setTab] = React.useState<Tabs>("add");

  // open Select District modal on launch
  React.useEffect(() => {
    if (district === undefined) {
      dispatch(ModalsActions.openModal("select-district"));
    } else {
      dispatch(NodesActions.setEditing(null));
    }
  }, [district, dispatch]);

  useDrawCurrentDistrict(map3d);
  useDrawAdditions(map3d);
  useMap3DEvents(map3d);

  // Set map mode to change raycast behavior on mousemove
  React.useEffect(() => {
    if (!map3d) return;
    map3d.setEditingMode(tab === "add" ? "add" : "remove");
    dispatch(NodesActions.setEditing(null));
  }, [map3d, tab, dispatch]);

  return (
    <Map3DContext value={map3d}>
      <div className="flex flex-row gap-2 w-screen h-screen bg-slate-900 text-white">
        <div className="grow flex flex-col">
          <Menu />

          <div className="grow relative">
            <canvas className="w-full h-full block" ref={canvasRef} />
            <Button
              className="absolute! bg-slate-800 left-4 top-4 tooltip"
              onClick={() => {
                map3d?.resetCamera();
              }}
              data-tooltip="Reset camera"
              data-flow="right"
            >
              <BoxIcon />
            </Button>
          </div>
        </div>
        <div className="w-[420px] h-full flex flex-col py-2 pr-2">
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
          <div className="flex flex-col h-[calc(100%_-_37.33px)] gap-2 p-2 border border-slate-500">
            {tab === "add" && <AddNodes />}
            {tab === "remove" && <RemoveNodes />}
          </div>
        </div>
      </div>
    </Map3DContext>
  );
}

export default App;
