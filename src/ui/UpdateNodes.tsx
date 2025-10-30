import { Trash2 } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getUpdates } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

function UpdateNodes() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(getUpdates);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const rootNodes = React.useMemo(
    () => nodes.filter((node) => node.parent === district?.name),
    [nodes, district],
  );

  if (!district) return null;

  const onDelete = () => {
    if (!editing) return;

    const children = nodes.filter((node) => node.parent === editing.id);

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

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div
          className="grow p-2 flex flex-col"
          onClick={() => dispatch(NodesActions.setEditing(null))}
        >
          {rootNodes.length === 0 && (
            <div className="grow flex items-center justify-center italic">
              Add nodes
            </div>
          )}
          {rootNodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </div>

        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          {editing && (
            <Button
              className="border-none tooltip"
              onClick={onDelete}
              data-tooltip="Remove node updates"
              data-flow="left"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col basis-[300px] shrink-0">
        {!editing && (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select node
          </div>
        )}
        {editing && <EditNode key={editing.id} />}
      </div>
    </>
  );
}

export default UpdateNodes;
