import Button from "../components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions } from "../store/nodesV2.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { Modes } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import AddNodes from "./AddNodes.tsx";
import RemoveNodes from "./RemoveNodes.tsx";
import UpdateNodes from "./UpdateNodes.tsx";

function Tabs() {
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const dispatch = useAppDispatch();

  const changeMode = (mode: Modes) => () => {
    dispatch(ProjectActions.setMode(mode));
    dispatch(NodesActions.selectNode(null));
  };

  return (
    <div className="w-[450px] h-full flex flex-col p-2 shrink-0">
      <div className="flex flex-row gap-0.5 -mb-[1px]">
        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "create" && "border-b-slate-900",
            mode !== "create" && "border-transparent",
          )}
          onClick={changeMode("create")}
          disabled={!district}
        >
          <div className="flex flex-row gap-1.5 items-baseline whitespace-nowrap">
            <span>
              Cre<span className="underline">a</span>te nodes
            </span>
          </div>
        </Button>

        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "update" && "border-b-slate-900",
            mode !== "update" && "border-transparent",
          )}
          onClick={changeMode("update")}
          disabled={!district || district.isCustom}
        >
          <div className="flex flex-row gap-1.5 items-baseline whitespace-nowrap">
            <span>
              Updat<span className="underline">e</span> nodes
            </span>
          </div>
        </Button>

        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "delete" && "border-b-slate-900",
            mode !== "delete" && "border-transparent",
          )}
          onClick={changeMode("delete")}
          disabled={!district || district.isCustom}
        >
          <div className="flex flex-row gap-1.5 items-baseline whitespace-nowrap">
            <span>
              <span className="underline">D</span>elete nodes
            </span>
          </div>
        </Button>
      </div>
      <div className="flex flex-col h-[calc(100%_-_37.33px)] gap-2 p-2 border border-slate-500">
        {mode === "create" && <AddNodes />}
        {mode === "update" && <UpdateNodes />}
        {mode === "delete" && <RemoveNodes />}
      </div>
    </div>
  );
}

export default Tabs;
