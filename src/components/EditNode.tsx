import * as React from "react";

import { useAppSelector } from "../hooks/hooks.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import EditNodePattern from "./EditNode.Pattern.tsx";
import EditNodeProperties from "./EditNode.Properties.tsx";

type Tabs = "properties" | "pattern";
const tabs = [
  { key: "properties", label: "Properties" },
  { key: "pattern", label: "Pattern" },
] as { key: Tabs; label: string }[];

interface EditNodeProps {
  mode: "create" | "update" | "delete";
}

function EditNode(props: EditNodeProps) {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const [tab, setTab] = React.useState<Tabs>("properties");

  React.useEffect(() => {
    const listener = ((event: CustomEvent<{ tab: Tabs }>) => {
      if (event.detail.tab) {
        setTab(event.detail.tab);
      }
    }) as EventListener;

    window.addEventListener("set-editing-tab", listener);

    return () => {
      window.removeEventListener("set-editing-tab", listener);
    };
  }, []);

  if (props.mode !== "create" || selected.length > 1) {
    return (
      <div className="grow flex flex-col">
        <EditNodeProperties selected={selected} mode={props.mode} />
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
      {tab === "properties" && (
        <EditNodeProperties selected={selected} mode={props.mode} />
      )}
      {tab === "pattern" && <EditNodePattern node={nodes[selected[0]]} />}
    </div>
  );
}

export default EditNode;
