import { CopyPlus, FilePlus, FolderPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { MAX_DEPTH } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
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
  const selected = useAppSelector(NodesSelectors.getSelectedNode);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const rootNodes = nodes.filter((node) => node.parent === district?.name);

  if (!district) return null;

  const onDelete = async () => {
    if (!selected) return;

    const confirmed = await dispatch(
      ModalsActions.openModal(
        "confirm",
        `Do you want to delete node "${selected.label}"? This action cannot be undone.`,
      ),
    );

    if (confirmed) {
      dispatch(NodesActions.deleteNodeDeep(selected.id));
    }
  };

  const onClone = () => {
    if (!selected) return;
    dispatch(NodesActions.cloneNode({ id: selected.id }));
  };

  const onAdd = (type: MapNode["type"]) => {
    const parent = selected ? selected.id : district.name;
    if (!map3d) return;
    const center = map3d.getCenter();
    if (!center) return;
    const position = (
      selected ? ["0", "0", "0"] : center.map(toString)
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
    dispatch(NodesActions.selectNode(action.payload.id));
  };

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

          {selected && (
            <>
              <div className="border border-slate-600 w-[1px]" />
              <Button
                className="border-none tooltip"
                onClick={onClone}
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
            disabled={selected?.type === "instance"}
            data-tooltip="Add instance"
            data-flow="top"
          >
            <FilePlus />
          </Button>
          <Button
            className="border-none tooltip"
            onClick={() => onAdd("group")}
            disabled={
              selected?.type === "instance" ||
              (selected && cache[selected.id].level >= MAX_DEPTH - 1)
            }
            data-tooltip="Add group"
            data-flow="left"
          >
            <FolderPlus />
          </Button>
        </div>
      </div>

      <div className="flex flex-col basis-[320px] shrink-0">
        {selected ? (
          <EditNode key={selected.id} />
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
