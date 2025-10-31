import * as React from "react";

import Button from "../components/common/Button.tsx";
import {
  useAppDispatch,
  useAppSelector,
  useGlobalShortcuts,
} from "../hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { Modes } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import AddNodes from "./AddNodes.tsx";
import RemoveNodes from "./RemoveNodes.tsx";
import UpdateNodes from "./UpdateNodes.tsx";

const tabs = [
  {
    key: "create",
    label: (
      <span>
        Cre<span className="underline">a</span>te nodes
      </span>
    ),
    shortcut: "a",
  },
  {
    key: "update",
    label: (
      <span>
        Updat<span className="underline">e</span> nodes
      </span>
    ),
    shortcut: "e",
  },
  {
    key: "delete",
    label: (
      <span>
        <span className="underline">D</span>elete nodes
      </span>
    ),
    shortcut: "d",
  },
] as { key: Modes; label: React.ReactNode; shortcut?: string }[];

function Tabs() {
  const mode = useAppSelector(ProjectSelectors.getMode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const dispatch = useAppDispatch();

  useGlobalShortcuts(
    "Escape",
    () => void dispatch(NodesActions.setEditing(null)),
  );

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
            shortcut={button.shortcut}
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
