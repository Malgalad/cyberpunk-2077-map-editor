import type { MapNodeV2 } from "../types/types.ts";
import Group from "./Node.Group.tsx";
import Instance from "./Node.Instance.tsx";

interface NodeProps {
  node: MapNodeV2;
}

function Node({ node }: NodeProps) {
  if (node.type === "group") return <Group node={node} />;
  if (node.type === "instance") return <Instance node={node} />;
  return null;
}

export default Node;
