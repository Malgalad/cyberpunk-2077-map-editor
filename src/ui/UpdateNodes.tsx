import { Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import EditNode from "../components/EditNode.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getUpdates } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

function UpdateNodes() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(getUpdates);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const rootNodes = nodes.filter((node) => node.parent === district?.name);

  if (!district) return null;

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

  return (
    <>
      <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
        <div
          className="grow p-2 flex flex-col"
          onClick={() => dispatch(NodesActions.selectNode(null))}
        >
          {rootNodes.length === 0 && (
            <div className="grow flex items-center justify-center italic">
              Pick box using "Select" or "Multiselect" tool on the map
            </div>
          )}
          {rootNodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </div>

        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          {selected.length > 0 && (
            <Tooltip tooltip="Discard node edits" flow="left">
              <Button className="border-none" onClick={onDelete}>
                <Trash2 />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex flex-col basis-[320px] shrink-0">
        {selected.length === 1 ? (
          <EditNode key={selected[0].id} />
        ) : (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select node
          </div>
        )}
      </div>
    </>
  );
}

export default UpdateNodes;
