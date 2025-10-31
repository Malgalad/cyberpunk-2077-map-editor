import {
  MousePointer2,
  Rotate3d,
  SquareDashedMousePointer,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import { clsx } from "../utilities/utilities.ts";

function ToolSelection() {
  const dispatch = useAppDispatch();
  const tool = useAppSelector(ProjectSelectors.getTool);

  return (
    <div
      className={clsx(
        "absolute bottom-5 left-1/2 -translate-x-1/2",
        "border border-slate-500 bg-slate-900",
        "flex flex-row gap-2 p-2 rounded-md",
      )}
    >
      <Button
        aria-selected={tool === "move"}
        className={clsx("tooltip")}
        onClick={() => void dispatch(ProjectActions.setTool("move"))}
        shortcut="w"
        data-tooltip="Move"
        data-flow="top"
      >
        <Rotate3d />
      </Button>
      <Button
        aria-selected={tool === "select"}
        className="tooltip"
        onClick={() => void dispatch(ProjectActions.setTool("select"))}
        shortcut="s"
        data-tooltip="Select"
        data-flow="top"
      >
        <MousePointer2 />
      </Button>
      <Button
        aria-selected={tool === "multiselect"}
        className="tooltip"
        onClick={() => void dispatch(ProjectActions.setTool("multiselect"))}
        shortcut="m"
        data-tooltip="Select area"
        data-flow="top"
        disabled
      >
        <SquareDashedMousePointer />
      </Button>
    </div>
  );
}

export default ToolSelection;
