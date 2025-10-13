import { CopyPlus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import RemovalsInstance from "../components/Removals.Instance.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getDistrictInstancedMeshTransforms } from "../store/district.selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { invariant, toNumber, transformToNode } from "../utilities.ts";

function RemoveNodes() {
  const dispatch = useAppDispatch();
  const map3D = useMap3D();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districtCenter = useAppSelector(DistrictSelectors.getDistrictCenter);
  const removals = useAppSelector(NodesSelectors.getRemovals);
  const editing = useAppSelector(NodesSelectors.getEditingId);
  const districtInstancedMeshTransforms = useAppSelector(
    getDistrictInstancedMeshTransforms,
  );

  const copyTransform = () => {
    if (!editing) return;
    invariant(district, "District is not defined");
    invariant(districtCenter, "District center is not defined");
    const node = transformToNode(
      districtInstancedMeshTransforms[toNumber(editing)],
      `${editing} Copy`,
      district.name,
      districtCenter.origin,
      districtCenter.minMax,
      district.cubeSize,
    );
    dispatch(NodesActions.insertNode(node));
    dispatch(NodesActions.setEditing(null));
  };

  return (
    <div className="flex flex-col gap-2 grow overflow-auto bg-slate-800 relative">
      <div
        className="grow p-2 flex flex-col"
        onClick={() => dispatch(NodesActions.setEditing(null))}
      >
        {!removals.length && (
          <div className="grow flex items-center justify-center italic bg-slate-800">
            Select and double click box to remove it.
          </div>
        )}

        {removals.map((index) => (
          <RemovalsInstance key={index} index={index} />
        ))}
      </div>

      {editing && (
        <div className="flex flex-row gap-2 sticky pr-1 bottom-0 justify-end border-t border-slate-900 bg-slate-800">
          <Button
            className="p-0! border-none tooltip"
            onClick={copyTransform}
            data-tooltip="Create a copy in the list of additions to edit."
            data-flow="left"
          >
            <CopyPlus />
          </Button>
          <Button
            className="p-0! border-none tooltip"
            onClick={() => {
              if (map3D) map3D.dontLookAt = true;
              dispatch(NodesActions.includeTransform(toNumber(editing)));
              dispatch(NodesActions.setEditing(null));
            }}
            data-tooltip="Delete from the list of removals"
            data-flow="left"
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}

export default RemoveNodes;
