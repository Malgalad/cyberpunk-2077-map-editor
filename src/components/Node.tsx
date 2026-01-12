import * as React from "react";

import { useAppStore } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodesV2.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { lookAtTransform } from "../utilities/map.ts";
import { projectNodesToDistrict } from "../utilities/transforms.ts";
import Group from "./Node.Group.tsx";
import Instance from "./Node.Instance.tsx";

interface NodeProps {
  node: MapNodeV2;
}

function Node({ node }: NodeProps) {
  const store = useAppStore();
  const map3D = useMap3D();

  const lookAtNode = React.useCallback(() => {
    if (!map3D) return;

    const state = store.getState();
    const district = DistrictSelectors.getDistrict(state);
    if (!district) return;
    const nodes = NodesSelectors.getNodes(state);
    const tree = NodesSelectors.getNodesTree(state);
    const index = NodesSelectors.getNodesIndex(state);
    const districtTree = tree[district.name];
    if (!districtTree || districtTree.type !== "district") return;
    const transforms = projectNodesToDistrict(
      district,
      nodes,
      districtTree[node.tag],
    );

    const transformId =
      node.type === "instance"
        ? node.id
        : index[node.id].descendantIds.find(
            (id) => nodes[id].type === "instance",
          );
    const transform = transforms.find(({ id }) => id === transformId);

    if (transform) {
      const [position, zoom] = lookAtTransform(transform, district);
      map3D.lookAt(position, zoom);
    }
  }, [map3D, store, node]);

  if (node.type === "group")
    return <Group lookAtNode={lookAtNode} node={node} />;
  if (node.type === "instance")
    return <Instance lookAtNode={lookAtNode} node={node} />;
  return null;
}

export default Node;
