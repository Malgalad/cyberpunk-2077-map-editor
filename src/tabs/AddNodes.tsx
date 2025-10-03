import { CopyPlus, FilePlus, FolderPlus, Trash2 } from "lucide-react";
import * as React from "react";

import Button from "../components/Button.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { Selectors } from "../store/globals.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types.ts";
import { toString } from "../utilities.ts";

function AddNodes() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const district = useAppSelector(Selectors.getDistrict);
  const districtData = useAppSelector(Selectors.getDistrictData);
  const rootNodes = React.useMemo(
    () => nodes.filter((node) => node.parent === district),
    [nodes, district],
  );

  if (!district || !districtData) return null;

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

  const onAdd = (type: MapNode["type"]) => {
    const parent = editing ? editing.id : district;
    const position = (
      editing ? ["0", "0", "0"] : districtData.center.toArray().map(toString)
    ) as MapNode["position"];
    const action = dispatch(
      NodesActions.addNode({
        type,
        parent,
        position,
      }),
    );
    dispatch(NodesActions.setEditing(action.payload.id));
  };

  return (
    <>
      <div className="flex flex-col gap-2 flex-1/2 overflow-auto bg-slate-800">
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
        <div className="flex flex-row gap-2 justify-end border-t border-slate-900">
          {editing && (
            <>
              <Button
                className="border-none tooltip"
                onClick={() => {
                  dispatch(NodesActions.cloneNode(editing.id));
                }}
                data-tooltip="Clone node"
                data-flow="top"
              >
                <CopyPlus />
              </Button>
              <Button
                className="border-none tooltip"
                onClick={onDelete}
                data-tooltip="Delete node"
                data-flow="top"
              >
                <Trash2 />
              </Button>
              <div className="border border-slate-600 w-[1px]" />
            </>
          )}

          <Button
            className="border-none tooltip"
            onClick={() => onAdd("instance")}
            disabled={editing?.type === "instance"}
            data-tooltip="Add instance"
            data-flow="top"
          >
            <FilePlus />
          </Button>
          <Button
            className="border-none tooltip"
            onClick={() => onAdd("group")}
            disabled={editing?.type === "instance"}
            data-tooltip="Add group"
            data-flow="left"
          >
            <FolderPlus />
          </Button>
        </div>
      </div>
      <div className="flex flex-col flex-1/2 overflow-auto bg-slate-800">
        {!editing && (
          <div className="grow flex items-center justify-center italic">
            Select node
          </div>
        )}
        {editing && <EditNode key={editing.id} />}
      </div>
    </>
  );
}

export default AddNodes;
