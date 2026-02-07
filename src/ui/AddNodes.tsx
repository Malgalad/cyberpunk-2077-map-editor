import { CopyPlus, FilePlus, FolderPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
// import { MAX_DEPTH } from "../constants.ts";
import { useAppSelector } from "../hooks/hooks.ts";
import {
  useAddNode,
  useCloneNode,
  useDeleteNode,
  useDeselectNode,
} from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import AddNodesTemplates from "./AddNodes.Templates.tsx";

function AddNodes() {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode(selected);
  const onClone = useCloneNode(nodes[selected[0]]);
  const onAddInstance = useAddNode("instance", "create");
  const onAddGroup = useAddNode("group", "create");

  if (!district) return null;

  const root = tree[district.name];
  const branches = root && root.type === "district" ? root.create : [];

  return (
    <>
      <div className="flex flex-col gap-2 grow max-h-[calc(100%_-_320px)] bg-slate-800 relative">
        <div
          className="grow flex flex-col overflow-auto bg-inherit"
          onClick={onDeselect}
        >
          {branches.length === 0 && (
            <div className="grow flex items-center justify-center italic">
              Add new nodes
            </div>
          )}

          {branches.map((branch) => (
            <Node key={branch.id} node={nodes[branch.id]} />
          ))}
        </div>

        <div className="flex flex-row gap-2 px-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800 z-[1000]">
          <AddNodesTemplates />

          {selected.length > 0 && (
            <>
              <div className="border border-slate-600 w-[1px]" />

              <Tooltip tooltip={"Clone node\n[Alt+Ctrl+C]"} tooltip2="Cloned!">
                <Button
                  className="border-none"
                  onClick={() => onClone()}
                  disabled={selected.length !== 1}
                >
                  <CopyPlus />
                </Button>
              </Tooltip>

              <Tooltip
                tooltip={
                  selected.length > 1
                    ? "Delete nodes\n[Delete]"
                    : "Delete node\n[Delete]"
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
              onClick={onAddInstance}
              disabled={selected.length > 1}
            >
              <FilePlus />
            </Button>
          </Tooltip>

          <Tooltip tooltip="Add group" flow="left">
            <Button
              className="border-none"
              onClick={onAddGroup}
              disabled={
                selected.length > 1 /* ||
                (nodes[selected[0]]?.type === "group" &&
                  cache[selected[0].id].level >= MAX_DEPTH - 1)*/
              }
            >
              <FolderPlus />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col basis-[320px] shrink-0">
        {selected.length > 0 ? (
          <EditNode key={selected[0]} mode="create" />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select a single node
          </div>
        )}
      </div>
    </>
  );
}

export default AddNodes;
