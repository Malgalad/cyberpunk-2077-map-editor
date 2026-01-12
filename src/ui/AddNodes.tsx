import {
  CopyPlus,
  FilePlus,
  FlipHorizontal2,
  FolderPlus,
  Trash2,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
// import { MAX_DEPTH } from "../constants.ts";
import { useAppSelector, useGlobalShortcuts } from "../hooks/hooks.ts";
import {
  useAddNode,
  useCloneNode,
  useDeleteNode,
  useDeselectNode,
  useMirrorNode,
} from "../hooks/nodes.hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import AddNodesTemplates from "./AddNodes.Templates.tsx";

function AddNodes() {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const root = tree[district?.name ?? "--"] ?? {};
  const branches = root && root.type === "district" ? root.create : [];

  const onDeselect = useDeselectNode();
  const onDelete = useDeleteNode(selected);
  const onClone = useCloneNode(nodes[selected[0]]);
  const onAddInstance = useAddNode("instance", "create");
  const onAddGroup = useAddNode("group", "create");
  const onMirror = useMirrorNode(nodes[selected[0]]);

  useGlobalShortcuts("Delete", onDelete);

  if (!district) return null;

  return (
    <>
      <div className="flex flex-col gap-2 grow max-h-[calc(100%_-_320px)] bg-slate-800 relative">
        <div
          className="grow p-2 flex flex-col overflow-auto"
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

        <div className="flex flex-row gap-2 px-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <AddNodesTemplates />

          {selected.length > 0 && (
            <>
              <div className="border border-slate-600 w-[1px]" />

              <Dropdown
                className="min-w-auto!"
                trigger={
                  <Tooltip tooltip="Mirror node" flow="bottom">
                    <Button className="border-none">
                      <FlipHorizontal2 />
                    </Button>
                  </Tooltip>
                }
                direction="top"
                align="center"
                indent={false}
                disabled={selected.length !== 1}
              >
                <DropdownItem onClick={() => onMirror("XY")}>
                  <span className="text-red-500">X</span>
                  <span className="text-green-500">Y</span>
                </DropdownItem>
                <DropdownItem onClick={() => onMirror("XZ")}>
                  <span className="text-red-500">X</span>
                  <span className="text-blue-500">Z</span>
                </DropdownItem>
                <DropdownItem onClick={() => onMirror("YZ")}>
                  <span className="text-green-500">Y</span>
                  <span className="text-blue-500">Z</span>
                </DropdownItem>
              </Dropdown>

              <Tooltip tooltip="Clone node" tooltip2="Cloned!">
                <Button
                  className="border-none"
                  onClick={() => void onClone()}
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
