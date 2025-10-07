import {
  Eye,
  FileDown,
  HardDriveDownload,
  HardDriveUpload,
  ListCheck,
} from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import { useAppDispatch, usePreviousValue } from "../hooks.ts";
import {
  useExportDDS,
  useLoadJSON,
  useSaveJSON,
} from "../hooks/importExport.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { ModalsActions } from "../store/modals.ts";
import type { PatternView } from "../types.ts";

function Menu() {
  const [viewOptionsOpen, setViewOptionsOpen] = React.useState(false);
  const wasViewOptionsOpen = usePreviousValue(viewOptionsOpen);
  const [patternView, setPatternView] =
    React.useState<PatternView>("wireframe");
  const map3D = useMap3D();
  const dispatch = useAppDispatch();
  const importJSON = useLoadJSON();
  const exportJSON = useSaveJSON();
  const exportDDS = useExportDDS();

  React.useEffect(() => {
    const listener = () => {
      setViewOptionsOpen(false);
    };
    if (viewOptionsOpen && !wasViewOptionsOpen) {
      document.addEventListener("click", listener);
    }

    return () => {
      if (!viewOptionsOpen && wasViewOptionsOpen) {
        document.removeEventListener("click", listener);
      }
    };
  }, [viewOptionsOpen, wasViewOptionsOpen]);

  React.useEffect(() => {
    map3D?.setPatternView(patternView);
  }, [map3D, patternView]);

  return (
    <div className="flex flex-row justify-between px-2">
      <div className="flex flex-row gap-2">
        <Button
          className="border-none"
          onClick={() =>
            dispatch(ModalsActions.openModal("select-district")).then(() => {})
          }
        >
          <ListCheck />
          Select district
        </Button>
        <Button
          className="border-none tooltip"
          onClick={() => importJSON()}
          data-tooltip="Load from JSON file"
          data-flow="bottom"
        >
          <HardDriveUpload />
          Open
        </Button>
        <Button
          className="border-none tooltip"
          onClick={() => exportJSON()}
          data-tooltip="Save to JSON file"
          data-flow="bottom"
        >
          <HardDriveDownload />
          Save
        </Button>
        <Button
          className="border-none tooltip"
          onClick={() => exportDDS()}
          data-tooltip="Export to DDS texture"
          data-flow="bottom"
        >
          <FileDown />
          Export
        </Button>
      </div>
      <div className="relative">
        <Button
          className="border-none"
          onClick={(event) => {
            event.stopPropagation();
            setViewOptionsOpen(!viewOptionsOpen);
          }}
        >
          <Eye />
          View Options
        </Button>

        {viewOptionsOpen && (
          <div
            className="flex flex-col p-2 gap-2 text-sm absolute top-full right-0 z-10 w-[150px] bg-slate-800 border border-slate-900 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="font-semibold">Pattern nodes</div>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "none"}
                onChange={() => setPatternView("none")}
              />
              Hidden
            </label>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "wireframe"}
                onChange={() => setPatternView("wireframe")}
              />
              Wireframe
            </label>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "solid"}
                onChange={() => setPatternView("solid")}
              />
              Solid
            </label>
            <div className="border-b border-slate-500" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Menu;
