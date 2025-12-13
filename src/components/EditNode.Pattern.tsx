import { useAppDispatch } from "../hooks/hooks.ts";
import { NodesActions } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import Button from "./common/Button.tsx";
import DraggableInput from "./common/DraggableInput.tsx";

interface EditNodePatternProps {
  node: MapNode;
}

const axii = [0, 1, 2] as const;

function EditNodePattern({ node }: EditNodePatternProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="grow bg-slate-800">
      <div className="flex flex-col gap-2 p-2">
        <div>
          {node.pattern?.enabled ? (
            <Button
              onClick={() => {
                dispatch(
                  NodesActions.patchNode(node.id, (draft) => {
                    draft.pattern!.enabled = false;
                  }),
                );
              }}
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={() => {
                dispatch(
                  NodesActions.patchNode(node.id, (draft) => {
                    if (!draft.pattern) {
                      draft.pattern = {
                        count: 1,
                        enabled: true,
                        position: ["0", "0", "0"],
                        rotation: ["0", "0", "0"],
                        scale: ["0", "0", "0"],
                      };
                    } else {
                      draft.pattern.enabled = true;
                    }
                  }),
                );
              }}
            >
              Enable
            </Button>
          )}
        </div>

        {node.pattern?.enabled && (
          <div className="grow grid grid-cols-[120px_auto] items-center gap-2 p-2">
            <div>Number of copies:</div>
            <div>
              <DraggableInput
                className="w-16"
                min={1}
                step={1}
                value={node.pattern.count.toString()}
                onChange={(event) => {
                  dispatch(
                    NodesActions.patchNode(node.id, (draft) => {
                      draft.pattern!.count = parseInt(event.target.value, 10);
                    }),
                  );
                }}
              />
            </div>
            <div>Position Δ:</div>
            <div>
              <div className="flex flex-row gap-1 items-center">
                {axii.map((i) => (
                  <DraggableInput
                    key={i}
                    className="w-20"
                    step={0.25}
                    value={node.pattern!.position[i]}
                    onChange={(event) => {
                      dispatch(
                        NodesActions.patchNode(node.id, (draft) => {
                          draft.pattern!.position[i] = event.target.value;
                        }),
                      );
                    }}
                  />
                ))}
              </div>
            </div>
            <div>Rotation Δ:</div>
            <div>
              <div className="flex flex-row gap-1">
                {axii.map((i) => (
                  <DraggableInput
                    key={i}
                    className="w-20"
                    step={0.5}
                    value={node.pattern!.rotation[i]}
                    onChange={(event) => {
                      dispatch(
                        NodesActions.patchNode(node.id, (draft) => {
                          draft.pattern!.rotation[i] = event.target.value;
                        }),
                      );
                    }}
                  />
                ))}
              </div>
            </div>
            <div>Scale Δ:</div>
            <div>
              <div className="flex flex-row gap-1 items-center">
                {axii.map((i) => (
                  <DraggableInput
                    key={i}
                    className="w-20"
                    step={0.1}
                    value={node.pattern!.scale[i]}
                    onChange={(event) => {
                      dispatch(
                        NodesActions.patchNode(node.id, (draft) => {
                          draft.pattern!.scale[i] = event.target.value;
                        }),
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditNodePattern;
