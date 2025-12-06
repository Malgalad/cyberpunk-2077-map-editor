import {
  ChevronLeft,
  ClipboardPlus,
  CopyPlus,
  FilePlus,
  FolderPlus,
  LayoutTemplate,
  Trash2,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { TEMPLATE_ID } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getAdditions, getTemplateNodes } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { toString } from "../utilities/utilities.ts";

function AddNodes() {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const nodes = useAppSelector(getAdditions);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const templates = useAppSelector(getTemplateNodes);
  const rootNodes = nodes.filter((node) => node.parent === district?.name);

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
        dispatch(NodesActions.deleteNodes([editing.id]));
      }
    });
  };

  const onAdd = (type: MapNode["type"]) => {
    const parent = editing ? editing.id : district.name;
    if (!map3d) return;
    const center = map3d.getCenter();
    if (!center) return;
    const position = (
      editing ? ["0", "0", "0"] : center.map(toString)
    ) as MapNode["position"];
    const tag = "create";
    const action = dispatch(
      NodesActions.addNode({
        type,
        tag,
        parent,
        position,
      }),
    );
    dispatch(NodesActions.setEditing(action.payload.id));
  };

  return (
    <>
      <div className="flex flex-col gap-2 grow max-h-[calc(100%_-_320px)] bg-slate-800 relative">
        <div
          className="grow p-2 flex flex-col overflow-auto"
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

        <div className="flex flex-row gap-2 px-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <Dropdown
            containerClassName="mr-auto"
            trigger={
              <Button className="border-none cursor-default! group-hover/level-0:bg-slate-600">
                <LayoutTemplate />
              </Button>
            }
            direction="left"
            align="bottom"
          >
            {templates.length === 0 && (
              <DropdownItem>No templates</DropdownItem>
            )}
            {templates.length > 0 &&
              templates.map((template) => (
                <Dropdown
                  key={template.id}
                  trigger={
                    <DropdownItem
                      className="group-hover/level-1:bg-slate-600"
                      icon={<ChevronLeft />}
                    >
                      {template.label}
                    </DropdownItem>
                  }
                  className="min-w-auto!"
                  direction="left"
                  align="bottom"
                  indent={false}
                >
                  <DropdownItem
                    onClick={async () => {
                      if (!map3d) return;
                      const position = map3d.getCenter();
                      if (!position) return;

                      dispatch(
                        NodesActions.cloneNode({
                          id: template.id,
                          updates: {
                            parent: district.name,
                            label: template.label.replace(
                              /TEMPLATE <(.+?)>/,
                              "$1",
                            ),
                            position: position.map(toString) as [
                              string,
                              string,
                              string,
                            ],
                          },
                        }),
                      );
                    }}
                  >
                    Insert
                  </DropdownItem>
                  <DropdownItem
                    onClick={async () => {
                      const confirmed = await dispatch(
                        ModalsActions.openModal(
                          "confirm",
                          `Do you want to delete template ${template.label}?`,
                        ),
                      );
                      if (confirmed) {
                        dispatch(NodesActions.deleteNodeDeep(template.id));
                      }
                    }}
                  >
                    Delete
                  </DropdownItem>
                </Dropdown>
              ))}
          </Dropdown>

          {editing && (
            <>
              <Tooltip
                tooltip="Create template from node"
                tooltip2="Template created!"
              >
                <Button
                  className="border-none"
                  onClick={() => {
                    dispatch(
                      NodesActions.cloneNode({
                        id: editing.id,
                        updates: {
                          label: `TEMPLATE <${editing.label}>`,
                          parent: TEMPLATE_ID,
                          position: ["0", "0", "0"],
                        },
                        selectAfterClone: false,
                      }),
                    );
                  }}
                >
                  <ClipboardPlus />
                </Button>
              </Tooltip>
              <div className="border border-slate-600 w-[1px]" />
              <Button
                className="border-none tooltip"
                onClick={() => {
                  dispatch(NodesActions.cloneNode({ id: editing.id }));
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

      <div className="flex flex-col basis-[320px] shrink-0">
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

export default AddNodes;
