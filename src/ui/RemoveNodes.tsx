import { Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getDeletions } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

function RemoveNodes() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const removals = useAppSelector(getDeletions);
  const editing = useAppSelector(NodesSelectors.getEditing);

  const onDelete = () => {
    if (!editing) return;

    const children = removals.filter((node) => node.parent === editing.id);

    if (editing.type === "group" && children.length > 0) {
      dispatch(
        ModalsActions.openModal(
          "alert",
          "Cannot delete group with child nodes. Delete or move child nodes first",
        ),
      );
      return;
    }

    dispatch(
      ModalsActions.openModal(
        "confirm",
        `Do you want to delete node "${editing.label}"? This action cannot be undone.`,
      ),
    ).then((confirmed) => {
      if (confirmed) {
        dispatch(NodesActions.deleteNode(editing.id));
      }
    });
  };

  if (!district) return null;

  return (
    <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
      <div
        className="grow p-2 flex flex-col"
        onClick={() => dispatch(NodesActions.setEditing(null))}
      >
        {!removals.length && (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select and double click box to remove it.
          </div>
        )}

        {removals.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </div>

      {editing && (
        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <Button
            className="border-none tooltip"
            onClick={() => onDelete()}
            data-tooltip="Cancel node removal"
            data-flow="left"
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}

export default RemoveNodes;
