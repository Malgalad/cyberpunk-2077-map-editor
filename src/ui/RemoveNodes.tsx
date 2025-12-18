import { FolderPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { MAX_DEPTH } from "../constants.ts";
import { useAppSelector, useGlobalShortcuts } from "../hooks/hooks.ts";
import {
  useAddNode,
  useDeleteNode,
  useDeselectNode,
} from "../hooks/nodes.hooks.ts";
import { getDeletions } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodes.ts";

function RemoveNodes() {
  const deleteNodes = useAppSelector(getDeletions);
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);
  const selectedDistrict = useAppSelector(DistrictSelectors.getDistrict);
  const nodesIndex = useAppSelector(NodesSelectors.getChildNodesCache);
  const rootNodes = deleteNodes.filter(
    (node) => node.parent === selectedDistrict?.name,
  );

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode();
  const onAddGroup = useAddNode("group", "delete");

  useGlobalShortcuts("Delete", onDelete);

  if (!selectedDistrict) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div className="grow p-2 flex flex-col" onClick={onDeselect}>
          {!deleteNodes.length && (
            <div className="grow flex items-center justify-center italic bg-slate-800">
              Pick block using "Select" tool on the map
            </div>
          )}

          {rootNodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </div>

        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          {selectedNodes.length > 0 && (
            <>
              <Tooltip
                tooltip={
                  selectedNodes.length > 1
                    ? "Delete nodes"
                    : selectedNodes[0].type === "instance"
                      ? "Discard block changes"
                      : "Delete node"
                }
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
                selectedNodes.length > 1 ||
                (selectedNodes[0]?.type === "group" &&
                  nodesIndex[selectedNodes[0].id].level >= MAX_DEPTH - 1)
              }
            >
              <FolderPlus />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col basis-[90px] shrink-0">
        {selectedNodes.length > 0 ? (
          <EditNode key={selectedNodes[0].id} mode="delete" />
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
