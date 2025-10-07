import { CircleDotDashed } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { frustumSize } from "../map3d/map3d.base.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { getNodesInstancedMeshTransforms } from "../store/nodes.selectors.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types.ts";
import { clsx, getTransformPosition } from "../utilities.ts";
import Button from "./common/Button.tsx";

interface InstanceProps {
  node: MapNode;
}

function Instance({ node }: InstanceProps) {
  const dispatch = useAppDispatch();
  const map3D = useMap3D();

  const districtCenter = useAppSelector(DistrictSelectors.getDistrictCenter);
  const editing = useAppSelector(NodesSelectors.getEditing);
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );

  const lookAtNode = () => {
    if (!map3D || !districtCenter) return;
    const transform = nodesInstancedMeshTransforms.find(
      ({ id }) => id === node.id,
    );
    if (transform) {
      const position = getTransformPosition(
        transform,
        districtCenter.origin,
        districtCenter.minMax,
      );
      const approximateScale =
        ((transform.scale.x + transform.scale.y) / 2) * 2 * 200;
      const zoom = Math.min(
        100,
        Math.floor(frustumSize / 2 / approximateScale),
      );
      map3D.lookAt(position, zoom);
    }
  };

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 border-2 -m-0.5",
        "border-dotted border-transparent cursor-pointer",
        editing?.id === node.id && "border-slate-100!",
      )}
      tabIndex={-1}
      role="button"
      onClick={(event) => {
        event.stopPropagation();
        dispatch(NodesActions.setEditing(node.id));
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        lookAtNode();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          dispatch(NodesActions.setEditing(node.id));
        } else if (event.key === "Escape") {
          dispatch(NodesActions.setEditing(null));
        }
      }}
    >
      <div className="grow flex flex-row justify-between items-center select-none">
        {node.label}
        {node.pattern?.enabled && (
          <Button
            className="border-none p-0! tooltip"
            data-tooltip="Has pattern"
            data-flow="left"
            onClick={() => {
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent("set-editing-tab", {
                    detail: { tab: "pattern" },
                  }),
                );
              });
            }}
          >
            <CircleDotDashed />
          </Button>
        )}
      </div>
    </div>
  );
}

export default Instance;
