import * as React from "react";

import { useAppSelector } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import {
  getAdditionsTransforms,
  getDeletionsTransforms,
  getUpdatesTransforms,
} from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { lookAtTransform } from "../utilities/map.ts";
import Group from "./Node.Group.tsx";
import Instance from "./Node.Instance.tsx";

interface NodeProps {
  node: MapNode;
}

function Node({ node }: NodeProps) {
  const map3D = useMap3D();
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const transforms = useAppSelector(
    node.tag === "create"
      ? getAdditionsTransforms
      : node.tag === "update"
        ? getUpdatesTransforms
        : getDeletionsTransforms,
  );
  const nodeCache = cache[node.id];

  const lookAtNode = React.useCallback(() => {
    if (!map3D || !district) return;

    const transformId =
      node.type === "instance" ? node.id : nodeCache.instances[0];
    const transform = transforms.find(({ id }) => id === transformId);

    if (transform) {
      const [position, zoom] = lookAtTransform(transform, district);
      map3D.lookAt(position, zoom);
    }
  }, [map3D, district, transforms, node, nodeCache]);

  if (node.type === "group")
    return <Group lookAtNode={lookAtNode} node={node} />;
  if (node.type === "instance")
    return <Instance lookAtNode={lookAtNode} node={node} />;
  return null;
}

export default Node;
