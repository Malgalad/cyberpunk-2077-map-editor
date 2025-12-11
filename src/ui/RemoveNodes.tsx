import { Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getDeletions } from "../store/@selectors.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

function RemoveNodes() {
  const dispatch = useAppDispatch();
  const removals = useAppSelector(getDeletions);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);

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
    <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
      <div
        className="grow p-2 flex flex-col"
        onClick={() => dispatch(NodesActions.selectNode(null))}
      >
        {!removals.length && (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Pick box using "Select" or "Multiselect" tool on the map
          </div>
        )}

        {removals.map((node) => (
          <Node key={node.id} node={node} />
        ))}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <Tooltip tooltip="Cancel node removal" flow="left">
            <Button className="border-none" onClick={onDelete}>
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default RemoveNodes;
