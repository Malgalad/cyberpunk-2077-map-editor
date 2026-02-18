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
  useShortcuts,
} from "./App.hooks.ts";
import { useAppSelector } from "./hooks/hooks.ts";
import { Map3DContext } from "./map3d/map3d.context.ts";
import { ProjectSelectors } from "./store/project.ts";
import Menu from "./ui/Menu.tsx";
import ResetButton from "./ui/ResetButton.tsx";
import Tabs from "./ui/Tabs.tsx";
import ToolSelection from "./ui/ToolSelection.tsx";
import { clsx } from "./utilities/utilities.ts";

const centerDotClassname =
  "before:absolute before:left-1/2 before:top-1/2 before:transform before:-translate-x-1/2 before:-translate-y-1/2 before:content-['+'] before:mix-blend-difference";

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const map3d = useInitMap3D(canvasRef);
  const tool = useAppSelector(ProjectSelectors.getTool);

  useShortcuts(map3d);
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
        <div className="grow flex flex-col @container">
          <Menu />

          <div
            className={clsx(
              "grow relative",
              centerDotClassname,
              tool === "move" && "cursor-move",
            )}
          >
            <canvas className="w-full h-full block" ref={canvasRef} />
            <ResetButton map3d={map3d} />
            <ToolSelection />
          </div>
        </div>

        <Tabs />
      </div>
    </Map3DContext>
  );
}

export default App;
