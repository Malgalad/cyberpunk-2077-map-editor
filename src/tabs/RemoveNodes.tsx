import { SquareX } from "lucide-react";

import Button from "../components/common/Button.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import type { Map3D } from "../map3d/map3d.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { clsx } from "../utilities.ts";

interface RemoveNodesProps {
  map3D: Map3D | null;
}

// TODO show transforms for removed nodes
// TODO copy removed nodes to add for editing
function RemoveNodes({ map3D }: RemoveNodesProps) {
  const dispatch = useAppDispatch();
  const removals = useAppSelector(NodesSelectors.getRemovals);
  const editing = useAppSelector(NodesSelectors.getEditingId);

  return (
    <div
      className="grow flex flex-col gap-1 p-2 overflow-auto bg-slate-800 relative"
      onClick={() => {
        dispatch(NodesActions.setEditing(null));
      }}
    >
      {!removals.length && (
        <div className="grow flex items-center justify-center italic bg-slate-800">
          Select and double click box to remove it.
        </div>
      )}
      {removals.map((index) => (
        <div
          key={index}
          className={clsx(
            "flex flex-row justify-between items-center gap-2",
            "border-2 -m-0.5 border-dotted border-transparent cursor-pointer",
            editing === `${index}` && "border-slate-100!",
          )}
          tabIndex={-1}
          role="button"
          onClick={(event) => {
            event.stopPropagation();
            dispatch(NodesActions.setEditing(`${index}`));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              dispatch(NodesActions.setEditing(`${index}`));
            } else if (event.key === "Escape") {
              dispatch(NodesActions.setEditing(null));
            }
          }}
        >
          <span>{index}</span>
          <Button
            className="p-0! border-none"
            onClick={() => {
              if (map3D) map3D.dontLookAt = true;
              dispatch(NodesActions.includeTransform(index));
              dispatch(NodesActions.setEditing(null));
            }}
          >
            <SquareX />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default RemoveNodes;
