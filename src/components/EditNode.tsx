import * as React from "react";

import { useAppSelector } from "../hooks.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { clsx } from "../utilities/utilities.ts";
import Button from "./common/Button.tsx";
import EditNodePattern from "./EditNode.Pattern.tsx";
import EditNodeProperties from "./EditNode.Properties.tsx";

type Tabs = "properties" | "pattern";
const tabs = [
  { key: "properties", label: "Properties" },
  { key: "pattern", label: "Pattern" },
] as { key: Tabs; label: string }[];

// TODO verify nodes are not out of bounds
function EditNode() {
  const node = useAppSelector(NodesSelectors.getSelectedNode) as MapNode;
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
      {tab === "properties" && <EditNodeProperties node={node} />}
      {tab === "pattern" && <EditNodePattern node={node} />}
    </div>
  );
}

export default EditNode;
