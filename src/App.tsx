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
import { Map3DContext } from "./map3d/map3d.context.ts";
import Menu from "./ui/Menu.tsx";
import Tabs from "./ui/Tabs.tsx";

function App() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const map3d = useInitMap3D(canvasRef);

  useDrawAllDistricts(map3d);
  useDrawCurrentDistrict(map3d);
  useDrawAdditions(map3d);
  useDrawUpdates(map3d);
  useDrawDeletions(map3d);
  useDrawSelection(map3d);
  useMap3DEvents(map3d);

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

        <Tabs />
      </div>
    </Map3DContext>
  );
}

export default App;
