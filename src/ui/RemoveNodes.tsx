import { Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Node from "../components/Node.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getDeletions } from "../store/@selectors.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";

function RemoveNodes() {
  const dispatch = useAppDispatch();
  const removals = useAppSelector(getDeletions);
  const selected = useAppSelector(NodesSelectors.getSelectedNode);

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

      {selected && (
        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <Button
            className="border-none tooltip"
            onClick={() => onDelete()}
            data-tooltip="Cancel node removal"
            data-flow="left"
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}

export default RemoveNodes;
