import { CopyPlus, FilePlus, FolderPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { MAX_DEPTH } from "../constants.ts";
import {
  useAppDispatch,
  useAppSelector,
  useGlobalShortcuts,
} from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getAdditions } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { toString } from "../utilities/utilities.ts";
import AddNodesTemplates from "./AddNodes.Templates.tsx";

function AddNodes() {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const nodes = useAppSelector(getAdditions);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const rootNodes = nodes.filter((node) => node.parent === district?.name);

  const onDelete = async () => {
    if (selected.length === 0) return;

    const message =
      selected.length > 1
        ? `Do you want to delete ${selected.length} nodes?`
        : `Do you want to delete node "${selected[0].label}"?`;
    const confirmed = await dispatch(
      ModalsActions.openModal("confirm", message),
    );

    if (confirmed) {
      for (const node of selected) {
        dispatch(NodesActions.deleteNodeDeep(node.id));
      }
    }
  };

  const onClone = () => {
    if (selected.length !== 1) return;
    dispatch(NodesActions.cloneNode({ id: selected[0].id }));
  };

  const onAdd = (type: MapNode["type"]) => {
    if (selected.length > 1 || !district) return;
    const parent = selected[0]
      ? selected[0].type === "group"
        ? selected[0].id
        : selected[0].parent
      : district.name;
    if (!map3d) return;
    const center = map3d.getCenter();
    if (!center) return;
    const position = (
      selected[0] ? ["0", "0", "0"] : center.map(toString)
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
    dispatch(
      NodesActions.selectNode({
        id: action.payload.id,
      }),
    );
  };

  useGlobalShortcuts("Delete", onDelete);

  if (!district) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow max-h-[calc(100%_-_320px)] bg-slate-800 relative">
        <div
          className="grow p-2 flex flex-col overflow-auto"
          onClick={() => dispatch(NodesActions.selectNode(null))}
        >
          {rootNodes.length === 0 && (
            <div className="grow flex items-center justify-center italic">
              Add new nodes
            </div>
          )}
          {rootNodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </div>

        <div className="flex flex-row gap-2 px-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <AddNodesTemplates />

          {selected.length > 0 && (
            <>
              <div className="border border-slate-600 w-[1px]" />
              <Tooltip tooltip="Clone node" tooltip2="Cloned!">
                <Button
                  className="border-none"
                  onClick={onClone}
                  disabled={selected.length !== 1}
                >
                  <CopyPlus />
                </Button>
              </Tooltip>
              <Tooltip
                tooltip={
                  selected.length > 1 ? "[Delete] nodes" : "[Delete] node"
                }
              >
                <Button className="border-none" onClick={onDelete}>
                  <Trash2 />
                </Button>
              </Tooltip>
              <div className="border border-slate-600 w-[1px]" />
            </>
          )}

          <Tooltip tooltip="Add instance">
            <Button
              className="border-none"
              onClick={() => onAdd("instance")}
              disabled={selected.length > 1}
            >
              <FilePlus />
            </Button>
          </Tooltip>
          <Tooltip tooltip="Add group" flow="left">
            <Button
              className="border-none"
              onClick={() => onAdd("group")}
              disabled={
                selected.length > 1 ||
                (selected[0]?.type === "group" &&
                  cache[selected[0].id].level >= MAX_DEPTH - 1)
              }
            >
              <FolderPlus />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col basis-[320px] shrink-0">
        {selected.length > 0 ? (
          <EditNode key={selected[0].id} mode="create" />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select node
          </div>
        )}
      </div>
    </>
  );
}

export default AddNodes;
