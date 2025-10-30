import Button from "../components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { Modes } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import AddNodes from "./AddNodes.tsx";
import RemoveNodes from "./RemoveNodes.tsx";
import UpdateNodes from "./UpdateNodes.tsx";

const tabs = [
  { key: "create", label: "Create nodes" },
  { key: "update", label: "Update nodes" },
  { key: "delete", label: "Delete nodes" },
] as { key: Modes; label: string }[];

function Tabs() {
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const dispatch = useAppDispatch();

  return (
    <div className="w-[420px] h-full flex flex-col py-2 pr-2">
      <div className="flex flex-row gap-0.5 -mb-[1px]">
        {tabs.map((button) => (
          <Button
            key={button.key}
            className={clsx(
              "w-1/2 z-10",
              button.key === mode && "border-b-slate-900",
              button.key !== mode && "border-transparent",
            )}
            onClick={() => {
              dispatch(ProjectActions.setMode(button.key));
              dispatch(NodesActions.setEditing(null));
            }}
            disabled={
              !district || (button.key !== "create" && district.isCustom)
            }
          >
            {button.label}
          </Button>
        ))}
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
