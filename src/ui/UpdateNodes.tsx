import {
  ArrowLeftToLine,
  ArrowRightToLine,
  FolderPlus,
  Trash2,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { MAX_DEPTH } from "../constants.ts";
import { useAppSelector, useGlobalShortcuts } from "../hooks/hooks.ts";
import {
  useAddNode,
  useCloneNode,
  useDeleteNode,
  useDeselectNode,
  useTransferNode,
} from "../hooks/nodes.hooks.ts";
import { getUpdates } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { toNumber, toString } from "../utilities/utilities.ts";

function UpdateNodes() {
  const updateNodes = useAppSelector(getUpdates);
  const selectedNodes = useAppSelector(NodesSelectors.getSelectedNodes);
  const selectedDistrict = useAppSelector(DistrictSelectors.getDistrict);
  const nodesIndex = useAppSelector(NodesSelectors.getChildNodesCache);
  const rootNodes = updateNodes.filter(
    (node) => node.parent === selectedDistrict?.name,
  );

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode(selectedNodes);
  const onClone = useCloneNode(selectedNodes[0]);
  const onAddGroup = useAddNode("group", "update");
  const onTransfer = useTransferNode(selectedNodes[0]);

  const onEditAsNew = () => {
    if (selectedNodes.length !== 1) return;

    const position = offsetPosition(selectedNodes[0]);

    onTransfer("delete", "create");
    onClone({ tag: "create", position });
  };

  useGlobalShortcuts("Delete", onDelete);

  if (!selectedDistrict) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div className="grow p-2 flex flex-col" onClick={onDeselect}>
          {rootNodes.length === 0 && (
            <div className="grow flex items-center justify-center italic">
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
              <Tooltip tooltip="Create node & delete block">
                <Button
                  className="border-none"
                  onClick={onEditAsNew}
                  disabled={selectedNodes.length !== 1}
                >
                  <ArrowLeftToLine />
                </Button>
              </Tooltip>

              <Tooltip tooltip="Delete block">
                <Button
                  className="border-none"
                  onClick={() => onTransfer("delete")}
                  disabled={selectedNodes.length !== 1}
                >
                  <ArrowRightToLine />
                </Button>
              </Tooltip>

              <Tooltip
                tooltip={
                  selectedNodes.length > 1 ? "Delete nodes" : "Delete node"
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

      <div className="flex flex-col basis-[270px] shrink-0">
        {selectedNodes.length > 0 ? (
          <EditNode key={selectedNodes[0].id} mode="update" />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select a single node
          </div>
        )}
      </div>
    </>
  );
}

const offsetPosition = (node: MapNode) => {
  return [
    node.position[0],
    node.position[1],
    toString(toNumber(node.position[2]) - toNumber(node.scale[2]) / 2),
  ] as MapNode["position"];
};

export default UpdateNodes;
