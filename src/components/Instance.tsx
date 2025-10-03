import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types.ts";
import { clsx } from "../utilities.ts";

interface InstanceProps {
  node: MapNode;
}

function Instance({ node }: InstanceProps) {
  const dispatch = useAppDispatch();
  const editing = useAppSelector(NodesSelectors.getEditing);

  return (
    <div>
      <div
        className={clsx(
          "flex flex-row items-center gap-2 border-2 border-dotted border-slate-800 p-0.5",
          "cursor-pointer",
          editing?.id === node.id && "border-slate-100!",
        )}
        tabIndex={-1}
        role="button"
        onClick={(event) => {
          event.stopPropagation();
          dispatch(NodesActions.setEditing(node.id));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            dispatch(NodesActions.setEditing(node.id));
          } else if (event.key === "Escape") {
            dispatch(NodesActions.setEditing(null));
          }
        }}
      >
        <div className="grow">
          {node.label}
          {node.pattern && <> {node.pattern.enabled ? "★" : "☆"}</>}
        </div>
      </div>
    </div>
  );
}

export default Instance;
