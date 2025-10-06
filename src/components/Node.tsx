import type { MapNode } from "../types.ts";
import Group from "./Node.Group.tsx";
import Instance from "./Node.Instance.tsx";

interface NodeProps {
  node: MapNode;
}

function Node(props: NodeProps) {
  if (props.node.type === "group") return <Group node={props.node} />;
  if (props.node.type === "instance") return <Instance node={props.node} />;
  return null;
}

export default Node;
