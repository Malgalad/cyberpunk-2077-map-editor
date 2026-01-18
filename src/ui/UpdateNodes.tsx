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
import { useAppSelector } from "../hooks/hooks.ts";
import {
  useAddNode,
  useChangeNodeTag,
  useCloneNode,
  useDeleteNode,
  useDeselectNode,
} from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { toTuple3 } from "../utilities/utilities.ts";

function UpdateNodes() {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const root = tree[district?.name ?? "--"] ?? {};
  const branches = root && root.type === "district" ? root.update : [];

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode(selected);
  const onClone = useCloneNode(nodes[selected[0]]);
  const onAddGroup = useAddNode("group", "update");
  const onTransfer = useChangeNodeTag(nodes[selected[0]]);

  const onEditAsNew = () => {
    if (selected.length !== 1) return;

    const position = offsetPosition(nodes[selected[0]]);

    onTransfer("delete", "create");
    onClone({ position, indexInDistrict: -1 }, { tag: "create" });
  };

  if (!district) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div className="grow flex flex-col" onClick={onDeselect}>
          {branches.length === 0 && (
            <div className="grow flex items-center justify-center italic">
              Pick block using "Select" tool on the map
            </div>
          )}

          {branches.map((treeNode) => (
            <Node key={treeNode.id} node={nodes[treeNode.id]} />
          ))}
        </div>

        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800 z-[1000]">
          {selected.length > 0 && (
            <>
              <Tooltip tooltip="Create node & delete block">
                <Button
                  className="border-none"
                  onClick={onEditAsNew}
                  disabled={selected.length !== 1}
                >
                  <ArrowLeftToLine />
                </Button>
              </Tooltip>

              <Tooltip tooltip="Delete block">
                <Button
                  className="border-none"
                  onClick={() => onTransfer("delete")}
                  disabled={selected.length !== 1}
                >
                  <ArrowRightToLine />
                </Button>
              </Tooltip>

              <Tooltip
                tooltip={
                  selected.length > 1
                    ? "Delete nodes\n[Delete]"
                    : "Delete node\n[Delete]"
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
                selected.length > 1 /* ||
                 (selected[0]?.type === "group" &&
                   nodesIndex[selectedNodes[0].id].level >= MAX_DEPTH - 1)*/
              }
            >
              <FolderPlus />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col basis-[270px] shrink-0">
        {selected.length > 0 ? (
          <EditNode key={selected[0]} mode="update" />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select a single node
          </div>
        )}
      </div>
    </>
  );
}

const offsetPosition = (node: MapNodeV2) => {
  return toTuple3([
    node.position[0],
    node.position[1],
    node.position[2] - node.scale[2] / 2,
  ]);
};

export default UpdateNodes;
