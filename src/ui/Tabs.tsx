import Button from "../components/common/Button.tsx";
import {
  useAppDispatch,
  useAppSelector,
  useGlobalShortcuts,
} from "../hooks.ts";
import { getDistrictCache } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import { clsx } from "../utilities/utilities.ts";
import AddNodes from "./AddNodes.tsx";
import RemoveNodes from "./RemoveNodes.tsx";
import UpdateNodes from "./UpdateNodes.tsx";

function Tabs() {
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const cache = useAppSelector(getDistrictCache);
  const dispatch = useAppDispatch();

  useGlobalShortcuts(
    "Escape",
    () => void dispatch(NodesActions.setEditing(null)),
  );

  return (
    <div className="w-[450px] h-full flex flex-col p-2 shrink-0">
      <div className="flex flex-row gap-0.5 -mb-[1px]">
        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "create" && "border-b-slate-900",
            mode !== "create" && "border-transparent",
          )}
          onClick={() => {
            dispatch(ProjectActions.setMode("create"));
            dispatch(NodesActions.setEditing(null));
          }}
          disabled={!district}
          shortcut="a"
        >
          <div className="flex flex-row gap-1.5 items-baseline">
            <span>
              Cre<span className="underline">a</span>te nodes
            </span>
            {(cache?.c.length ?? 0) > 0 && (
              <span className="text-green-400 text-sm">+{cache?.c.length}</span>
            )}
          </div>
        </Button>

        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "update" && "border-b-slate-900",
            mode !== "update" && "border-transparent",
          )}
          onClick={() => {
            dispatch(ProjectActions.setMode("update"));
            dispatch(NodesActions.setEditing(null));
          }}
          disabled={!district || district.isCustom}
          shortcut="e"
        >
          <div className="flex flex-row gap-1.5 items-baseline">
            <span>
              Updat<span className="underline">e</span> nodes
            </span>
            {(cache?.u.length ?? 0) > 0 && (
              <span className="text-yellow-400 text-sm">
                ~{cache?.u.length}
              </span>
            )}
          </div>
        </Button>

        <Button
          className={clsx(
            "w-1/3 z-10",
            mode === "delete" && "border-b-slate-900",
            mode !== "delete" && "border-transparent",
          )}
          onClick={() => {
            dispatch(ProjectActions.setMode("delete"));
            dispatch(NodesActions.setEditing(null));
          }}
          disabled={!district || district.isCustom}
          shortcut="d"
        >
          <div className="flex flex-row gap-1.5 items-baseline">
            <span>
              <span className="underline">D</span>elete nodes
            </span>
            {(cache?.d.length ?? 0) > 0 && (
              <span className="text-red-400 text-sm">-{cache?.d.length}</span>
            )}
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
