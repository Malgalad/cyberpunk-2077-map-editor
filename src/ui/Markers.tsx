import {
  Diamond,
  MapPinPlus,
  SquareMinus,
  SquarePlus,
  Trash2,
} from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import { MARKER_ID } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { TreeNode } from "../types/types.ts";
import { clsx, toTuple3 } from "../utilities/utilities.ts";

const emptyArr: TreeNode[] = [];

function Markers() {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const [expanded, setExpanded] = React.useState(false);
  const markersTree = tree[MARKER_ID];
  const markers =
    markersTree && markersTree.type === "simpleRoot"
      ? markersTree.children
      : emptyArr;

  React.useEffect(() => {
    if (!map3d) return;

    if (!markers.length) map3d.setMarkers([]);

    const markerNodes = markers.map((marker) => nodes[marker.id]);

    map3d.setMarkers(markerNodes);
  }, [markers, nodes, map3d]);

  const onCreate = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!map3d) return;
    const position = toTuple3(map3d.getCenter());

    const node = dispatch(
      NodesActions.createNode({
        type: "instance",
        tag: "create",
        district: MARKER_ID,
        parent: null,
        label: "",
        scale: [1, 1, 1],
        position,
      }),
    );
    dispatch(NodesActions.selectNode(node.payload.id));
  };

  const onLook = ({ id }: TreeNode) => {
    if (!map3d) return;
    const { position } = nodes[id];
    map3d.lookAt(
      new THREE.Vector3(position[0], position[2], -position[1]),
      Math.max(map3d.zoom, 30),
    );
  };

  const onClear = () => {
    dispatch(NodesActions.deleteNodesById(markers.map((marker) => marker.id)));
  };

  function renderMarker(marker: TreeNode) {
    return (
      <div
        className={clsx("w-6 h-6 cursor-pointer")}
        key={marker.id}
        onClick={(event) => {
          event.stopPropagation();
          dispatch(NodesActions.selectNode(marker.id));
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onLook(marker);
        }}
      >
        <Diamond
          className={clsx({
            "text-pink-800": selected.includes(marker.id),
            "text-cyan-800": !selected.includes(marker.id),
          })}
        />
      </div>
    );
  }

  return (
    <div className={"flex flex-col"}>
      <div
        className="flex flex-row items-center gap-2 px-2 py-0.5 cursor-pointer sticky bg-inherit"
        role="button"
        tabIndex={0}
      >
        <Button
          className="p-0! min-w-6! w-6 h-6 border-0!"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <SquareMinus /> : <SquarePlus />}
        </Button>
        <div className="grow flex flex-row justify-between items-center select-none">
          <span>
            Markers <span className="text-gray-400">({markers.length})</span>
          </span>
          <div className="flex flex-row gap-1">
            <Tooltip tooltip="Remove all markers" flow="left">
              <Button className="border-none p-0!" onClick={onClear}>
                <Trash2 />
              </Button>
            </Tooltip>
            <Tooltip tooltip="Add marker" flow="left">
              <Button className="border-none p-0!" onClick={onCreate}>
                <MapPinPlus />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      {expanded && markers.length > 0 && (
        <div className="pl-8 flex flex-row flex-wrap gap-0.5 bg-inherit">
          {markers.map(renderMarker)}
        </div>
      )}
    </div>
  );
}

export default Markers;
