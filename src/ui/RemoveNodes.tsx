import { ArrowLeftToLine, FolderPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { useAppSelector, useGlobalShortcuts } from "../hooks/hooks.ts";
import {
  useAddNode,
  useDeleteNode,
  useDeselectNode,
  useTransferNode,
} from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";

function RemoveNodes() {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const root = tree[district?.name ?? "--"] ?? {};
  const branches = root && root.type === "district" ? root.delete : [];

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode(selected);
  const onAddGroup = useAddNode("group", "delete");
  const onTransfer = useTransferNode(nodes[selected[0]]);

  useGlobalShortcuts("Delete", onDelete);

  if (!district) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div className="grow p-2 flex flex-col" onClick={onDeselect}>
          {!branches.length && (
            <div className="grow flex items-center justify-center italic bg-slate-800">
              Pick block using "Select" tool on the map
            </div>
          )}

          {branches.map((branch) => (
            <Node key={branch.id} node={nodes[branch.id]} />
          ))}
        </div>

        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          {selected.length > 0 && (
            <>
              <Tooltip tooltip="Update block">
                <Button
                  className="border-none"
                  onClick={() => onTransfer("update")}
                  disabled={selected.length !== 1}
                >
                  <ArrowLeftToLine />
                </Button>
              </Tooltip>

              <Tooltip
                tooltip={selected.length > 1 ? "Delete nodes" : "Delete node"}
                flow="top"
              >
                <Button className="border-none" onClick={onDelete}>
                  <Trash2 />
                </Button>
              </Tooltip>

              <div className="border border-slate-600 w-[1px]" />
            </>
          )}

          <Tooltip tooltip="Add group" flow="left">
            <Button
              className="border-none"
              onClick={onAddGroup}
              disabled={
                selected.length > 1 /* ||
                (selected[0]?.type === "group" &&
                  nodesIndex[selected[0].id].level >= MAX_DEPTH - 1)*/
              }
            >
              <FolderPlus />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col basis-[132px] shrink-0">
        {selected.length > 0 ? (
          <EditNode key={selected[0]} mode="delete" />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select a single node
          </div>
        )}
      </div>
    </>
  );
}

export default RemoveNodes;
