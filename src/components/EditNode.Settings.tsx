import { NODE_VERSION } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { NodesSelectors } from "../store/nodes.ts";
import { OptionsActions, OptionsSelectors } from "../store/options.ts";
import type { MapNode } from "../types/types.ts";
import Toggle from "./common/Toggle.tsx";
import { useUpdateNode } from "./EditNode.Properties.hooks.ts";

function EditNodeSettings({ node }: { node: MapNode }) {
  const adjustZPosition = useAppSelector(OptionsSelectors.getAdjustZPosition);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const dispatch = useAppDispatch();
  const updateNode = useUpdateNode(node);
  let parent = node.parent;
  let inherited = !!node.transformFrame;
  while (parent) {
    inherited ||=
      !!nodes[parent].preserveShape || !!nodes[parent].transformFrame;
    parent = nodes[parent].parent;
  }

  return (
    <div className="grow bg-slate-800">
      <div className="flex flex-col gap-4 p-2">
        {node.type === "group" && (
          <>
            <div className="flex flex-row gap-2 items-center">
              <div>Preserve shape when scaling</div>
              <Toggle
                enabled={!!node.preserveShape}
                onChange={(preserveShape) =>
                  updateNode({
                    preserveShape,
                    version: Math.max(node.version ?? 0, NODE_VERSION),
                  })
                }
              />
            </div>
            <div className="text-sm pl-4">
              Stretch this group, its pattern copies, and all nested groups
              together. Pattern spacing and scale steps stretch too. Angled
              blocks adjust their angles and dimensions to stay close to the
              stretched shape; corners may protrude slightly.
              {inherited && " Already inherited by this group."}
            </div>
          </>
        )}
        <div className="flex flex-row gap-2 items-center">
          <div>Sticky bottom</div>
          <Toggle
            enabled={!!adjustZPosition}
            onChange={() =>
              dispatch(OptionsActions.toggleZAdjustment(!adjustZPosition))
            }
          />
        </div>
        <div className="text-sm pl-4">
          Adjust node's Z position based on its scale, so that its bottom face
          (or edge!) stays at the same level.
        </div>
      </div>
    </div>
  );
}

export default EditNodeSettings;
