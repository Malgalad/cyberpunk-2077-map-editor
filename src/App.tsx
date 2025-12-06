import { BoxIcon } from "lucide-react";
import * as React from "react";

import {
  useDrawAdditions,
  useDrawAllDistricts,
  useDrawCurrentDistrict,
  useDrawDeletions,
  useDrawSelection,
  useDrawUpdates,
  useInitMap3D,
  useMap3DEvents,
} from "./App.hooks.ts";
import Button from "./components/common/Button.tsx";
import Tooltip from "./components/common/Tooltip.tsx";
import { useAppSelector } from "./hooks.ts";
import { Map3DContext } from "./map3d/map3d.context.ts";
import { ProjectSelectors } from "./store/project.ts";
import Menu from "./ui/Menu.tsx";
import Tabs from "./ui/Tabs.tsx";
import ToolSelection from "./ui/ToolSelection.tsx";
import { clsx } from "./utilities/utilities.ts";

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const map3d = useInitMap3D(canvasRef);
  const tool = useAppSelector(ProjectSelectors.getTool);

  useDrawAllDistricts(map3d);
  useDrawCurrentDistrict(map3d);
  useDrawAdditions(map3d);
  useDrawUpdates(map3d);
  useDrawDeletions(map3d);
  useDrawSelection(map3d);
  useMap3DEvents(map3d);

  return (
    <Map3DContext value={map3d}>
      <div className="flex flex-row w-screen h-screen bg-slate-900 text-white">
        <div className="grow flex flex-col">
          <Menu />

          <div
            className={clsx("grow relative", tool === "move" && "cursor-move")}
          >
            <canvas className="w-full h-full block" ref={canvasRef} />
            <Tooltip tooltip="Reset camera [R]" flow="right">
              <Button
                className="absolute! bg-slate-800 left-4 top-4"
                onClick={() => {
                  map3d?.resetCamera();
                }}
                shortcut="r"
              >
                <BoxIcon />
              </Button>
            </Tooltip>
            <ToolSelection />
          </div>
        </div>

        <Tabs />
      </div>
    </Map3DContext>
  );
}

export default App;
