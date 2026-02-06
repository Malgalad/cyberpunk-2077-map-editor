import { MousePointer2, Rotate3d } from "lucide-react";

import Button from "../components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
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
        data-tooltip="Move [W]"
        data-flow="top"
      >
        <Rotate3d />
      </Button>
      <Button
        aria-selected={tool === "select"}
        className="tooltip"
        onClick={() => void dispatch(ProjectActions.setTool("select"))}
        data-tooltip={"Select [S]\nPress [Shift] to select deletion nodes"}
        data-flow="top"
      >
        <MousePointer2 />
      </Button>
    </div>
  );
}

export default ToolSelection;
