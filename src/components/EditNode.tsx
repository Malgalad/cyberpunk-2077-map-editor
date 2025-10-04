import * as React from "react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { Selectors } from "../store/globals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { Districts, MapNode } from "../types.ts";
import { clsx } from "../utilities.ts";
import Button from "./Button.tsx";
import DraggableInput from "./DraggableInput.tsx";
import Input from "./Input.tsx";
import Select from "./Select.tsx";

const axii = [0, 1, 2] as const;

type Tabs = "properties" | "pattern";
const tabs = [
  { key: "properties", label: "Properties" },
  { key: "pattern", label: "Pattern" },
] as { key: Tabs; label: string }[];

function EditNode() {
  const dispatch = useAppDispatch();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const node = useAppSelector(NodesSelectors.getEditing) as MapNode;
  const district = useAppSelector(Selectors.getDistrict) as keyof Districts;
  const [tab, setTab] = React.useState<Tabs>("properties");
  const parents = React.useMemo(
    () => [
      { label: district, value: district },
      ...nodes
        .filter((other) => other.type === "group" && other.id !== node.id)
        .map((node) => ({ label: node.label, value: node.id })),
    ],
    [district, nodes, node.id],
  );

  function renderProperties() {
    return (
      <div className="grow bg-slate-800">
        <div className="grid grid-cols-[120px_auto] items-center gap-2 p-2 ">
          <div>Label:</div>
          <div>
            <Input
              type="text"
              className="w-[248px]"
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
                step={node.type === "instance" ? 2 : 0.1}
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
        </div>
      </div>
    );
  }

  function renderPattern() {
    return (
      <div className="grow bg-slate-800">
        <div className="flex flex-col gap-2 p-2">
          <div>
            {node.pattern?.enabled ? (
              <Button
                onClick={() => {
                  dispatch(
                    NodesActions.patchNode((draft) => {
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
                    NodesActions.patchNode((draft) => {
                      if (!draft.pattern) {
                        draft.pattern = {
                          count: 1,
                          enabled: true,
                          position: ["0", "0", "0"],
                          rotation: ["0", "0", "0"],
                          scale: ["1", "1", "1"],
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
                  onChange={(value) => {
                    dispatch(
                      NodesActions.patchNode((draft) => {
                        draft.pattern!.count = parseInt(value, 10);
                      }),
                    );
                  }}
                />
              </div>
              <div>Position:</div>
              <div>
                <div className="flex flex-row gap-1 items-center">
                  {axii.map((i) => (
                    <DraggableInput
                      key={i}
                      className="w-20"
                      step={0.25}
                      value={node.pattern!.position[i]}
                      onChange={(value) => {
                        dispatch(
                          NodesActions.patchNode((draft) => {
                            draft.pattern!.position[i] = value;
                          }),
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>Rotation:</div>
              <div>
                <div className="flex flex-row gap-1">
                  {axii.map((i) => (
                    <DraggableInput
                      key={i}
                      className="w-20"
                      value={node.pattern!.rotation[i]}
                      onChange={(value) => {
                        dispatch(
                          NodesActions.patchNode((draft) => {
                            draft.pattern!.rotation[i] = value;
                          }),
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>Scale:</div>
              <div>
                <div className="flex flex-row gap-1 items-center">
                  {axii.map((i) => (
                    <DraggableInput
                      key={i}
                      className="w-20"
                      step={0.1}
                      value={node.pattern!.scale[i]}
                      onChange={(value) => {
                        dispatch(
                          NodesActions.patchNode((draft) => {
                            draft.pattern!.scale[i] = value;
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

  return (
    <div className="grow flex flex-col">
      <div className="flex flex-row gap-0.5 -mb-[1px]">
        {tabs.map((button) => (
          <Button
            key={button.key}
            className={clsx(
              "w-1/2 z-10 border-none",
              button.key === tab && "bg-slate-800",
              button.key !== tab && "bg-slate-900",
            )}
            onClick={() => setTab(button.key)}
          >
            {button.label}
          </Button>
        ))}
      </div>
      {tab === "properties" && renderProperties()}
      {tab === "pattern" && renderPattern()}
    </div>
  );
}

export default EditNode;
