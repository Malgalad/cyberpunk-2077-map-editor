import { SquareX } from "lucide-react";

import Button from "../components/Button.tsx";
import { useAppSelector } from "../hooks.ts";
import { NodesSelectors } from "../store/nodes.ts";

function RemoveNodes() {
  const removals = useAppSelector(NodesSelectors.getRemovals);

  return (
    <div className="grow flex flex-col gap-1 p-2 overflow-auto bg-slate-800 relative">
      {!removals.length && (
        <div className="grow flex items-center justify-center italic bg-slate-800">
          Select and double click box to remove it.
        </div>
      )}
      {removals.map((index) => (
        <div key={index} className="flex justify-between">
          <span>{index}</span>
          <Button className="p-0! border-none">
            <SquareX />
          </Button>
        </div>
      ))}
    </div>
  );
}

export default RemoveNodes;
