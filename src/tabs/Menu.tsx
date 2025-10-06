import { FileDown } from "lucide-react";

import Button from "../components/common/Button.tsx";
import { useAppDispatch } from "../hooks.ts";
import {
  useExportDDS,
  useLoadJSON,
  useSaveJSON,
} from "../hooks/importExport.ts";
import { ModalsActions } from "../store/modals.ts";

function Menu() {
  const dispatch = useAppDispatch();
  const importJSON = useLoadJSON();
  const exportJSON = useSaveJSON();
  const exportDDS = useExportDDS();

  return (
    <div className="flex flex-row gap-2 px-2">
      <Button
        className="border-none"
        onClick={() =>
          dispatch(ModalsActions.openModal("select-district")).then(() => {})
        }
      >
        Select district
      </Button>
      <Button
        className="border-none tooltip"
        onClick={() => importJSON()}
        data-tooltip="Load from JSON file"
        data-flow="bottom"
      >
        Open
      </Button>
      <Button
        className="border-none tooltip"
        onClick={() => exportJSON()}
        data-tooltip="Save to JSON file"
        data-flow="bottom"
      >
        Save
      </Button>
      <Button
        className="border-none tooltip"
        onClick={() => exportDDS()}
        data-tooltip="Export to DDS texture"
        data-flow="bottom"
      >
        Export
        <FileDown />
      </Button>
    </div>
  );
}

export default Menu;
