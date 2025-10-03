import * as React from "react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { Selectors } from "../store/globals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { Districts, MapNode } from "../types.ts";
import Button from "./Button.tsx";
import DraggableInput from "./DraggableInput.tsx";
import Input from "./Input.tsx";
import Select from "./Select.tsx";

const axii = [0, 1, 2] as const;

function EditNode() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const node = useAppSelector(NodesSelectors.getEditing) as MapNode;
  const district = useAppSelector(Selectors.getDistrict) as keyof Districts;
  const [copy] = React.useState(node);
  const parents = React.useMemo(
    () => [
      { label: district, value: district },
      ...nodes
        .filter((other) => other.type === "group" && other.id !== node.id)
        .map((node) => ({ label: node.label, value: node.id })),
    ],
    [district, nodes, node.id],
  );

  return (
    <div className="grid grid-cols-[100px,auto] gap-2 p-2">
      <div>Label:</div>
      <div>
        <Input
          type="text"
          className="w-[248px]"
          disabled={node.type === "instance"}
          value={node.label}
          onChange={(event) => {
            dispatch(
              NodesActions.patchNode((draft) => {
                draft.label = event.target.value;
              }),
            );
          }}
        />
      </div>
      <div>Parent:</div>
      <div>
        <Select
          className="w-[248px]"
          label={""}
          items={parents}
          onChange={(value) => {
            dispatch(
              NodesActions.patchNode((draft) => {
                draft.parent = value;
              }),
            );
          }}
          value={node.parent}
        />
      </div>
      <div>Position:</div>
      <div className="flex flex-row gap-1 items-center">
        {axii.map((i) => (
          <DraggableInput
            key={i}
            className="w-20"
            step={0.25}
            value={node.position[i]}
            onChange={(value) => {
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.position[i] = value;
                }),
              );
            }}
          />
        ))}
      </div>
      <div>Rotation:</div>
      <div className="flex flex-row gap-1">
        {axii.map((i) => (
          <DraggableInput
            key={i}
            className="w-20"
            value={node.rotation[i]}
            onChange={(value) => {
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.rotation[i] = value;
                }),
              );
            }}
          />
        ))}
      </div>
      <div>Scale:</div>
      <div className="flex flex-row gap-1 items-center">
        {axii.map((i) => (
          <DraggableInput
            key={i}
            className="w-20"
            step={2}
            value={node.scale[i]}
            onChange={(value) => {
              dispatch(
                NodesActions.patchNode((draft) => {
                  draft.scale[i] = value;
                }),
              );
            }}
          />
        ))}
      </div>
      {/*
      <div className="flex flex-col gap-2 p-2 border border-slate-300 rounded-md">
        <div className="flex flex-row gap-2 items-center">
          {node.pattern ? (
            <>
              <Button
                onClick={() => {
                  context.patchNode(node.id, (draft) => {
                    draft.pattern = undefined;
                  });
                }}
              >
                Remove pattern
              </Button>
              <label>
                <input
                  type="checkbox"
                  checked={node.pattern?.enabled}
                  onChange={() => {
                    context.patchNode(node.id, (draft) => {
                      draft.pattern!.enabled = !draft.pattern!.enabled;
                    });
                  }}
                />{" "}
                Enabled
              </label>
            </>
          ) : (
            <Button
              onClick={() => {
                context.patchNode(node.id, (draft) => {
                  draft.pattern = {
                    count: 1,
                    enabled: true,
                    position: [0, 0, 0],
                    rotation: [0, 0, 0, 1],
                    scale: [1, 1, 1],
                  };
                });
              }}
            >
              Add pattern
            </Button>
          )}
        </div>
        {node.pattern && (
          <>
            <div>
              <div>Number of copies:</div>
              <Input
                type="number"
                className="w-16"
                value={node.pattern.count}
                onChange={(event) =>
                  context.patchNode(node.id, (draft) => {
                    draft.pattern!.count = parseInt(event.target.value);
                  })
                }
              />
            </div>
            <div>
              <div>Position:</div>
              <div className="flex flex-row gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <Input
                    key={`${i}-${useAbsolutePosition ? "absolute" : "relative"}`}
                    className="w-20"
                    type="text"
                    value={formatClampedValue(
                      node.pattern!.position[i],
                      origin[i],
                      boundingBox[i],
                      useAbsolutePosition,
                    )}
                    onChange={(event) => {
                      context.patchNode(node.id, (draft) => {
                        draft.pattern!.position[i] = parseClampedValue(
                          parseFloat(event.target.value),
                          origin[i],
                          boundingBox[i],
                          useAbsolutePosition,
                        );
                      });
                    }}
                  />
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={useAbsolutePosition}
                    onChange={() =>
                      setUseAbsolutePosition(!useAbsolutePosition)
                    }
                  />{" "}
                  Use absolute
                </label>
              </div>
            </div>
            <div>
              <div>Rotation:</div>
              <div className="flex flex-row gap-1">
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    className="w-20"
                    type="text"
                    defaultValue={patternRotation[i]}
                    onBlur={(event) => {
                      context.patchNode(node.id, (draft) => {
                        draft.pattern!.rotation = parseRotation(
                          patternRotation.toSpliced(
                            i,
                            1,
                            parseFloat(event.target.value),
                          ),
                        );
                      });
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div>Scale:</div>
              <div className="flex flex-row gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <Input
                    key={`${i}-${useAbsoluteScale ? "absolute" : "relative"}`}
                    className="w-20"
                    type="text"
                    value={formatClampedValue(
                      node.pattern!.scale[i],
                      0,
                      district.cubeSize * 2,
                      useAbsoluteScale,
                    )}
                    onChange={(evt) => {
                      context.patchNode(node.id, (draft) => {
                        draft.pattern!.scale[i] = parseClampedValue(
                          parseFloat(evt.target.value),
                          0,
                          district.cubeSize * 2,
                          useAbsoluteScale,
                        );
                      });
                    }}
                  />
                ))}
                {node.type === "instance" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={useAbsoluteScale}
                      onChange={() => setUseAbsoluteScale(!useAbsoluteScale)}
                    />{" "}
                    Use absolute
                  </label>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      */}
      <div className="col-span-2 flex flex-row gap-2 items-center">
        <Button onClick={() => dispatch(NodesActions.setEditing(null))}>
          Done
        </Button>
        <Button
          onClick={() => {
            dispatch(
              NodesActions.patchNode((draft) => {
                draft.parent = copy.parent;
                draft.pattern = copy.pattern;
                draft.label = copy.label;
                draft.position = copy.position;
                draft.rotation = copy.rotation;
                draft.scale = copy.scale;
              }),
            );
            dispatch(NodesActions.setEditing(null));
          }}
        >
          Revert changes
        </Button>
      </div>
    </div>
  );
}

export default EditNode;
