import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import {
  clsx,
  getDistrictInstancedMeshTransforms,
  lookAtTransform,
} from "../utilities.ts";

interface RemovalsInstanceProps {
  index: number;
}

function RemovalsInstance({ index }: RemovalsInstanceProps) {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const editingId = useAppSelector(NodesSelectors.getEditingId);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districtCenter = useAppSelector(DistrictSelectors.getDistrictCenter);

  const lookAtNode = async () => {
    if (!map3d || !districtCenter || !district) return;

    const transforms = await getDistrictInstancedMeshTransforms(district);
    const transform = transforms[index];

    if (transform) {
      const [position, zoom] = lookAtTransform(
        transform,
        districtCenter.origin,
        districtCenter.minMax,
      );
      map3d.lookAt(position, zoom);
    }
  };

  return (
    <div
      className={clsx(
        "flex flex-row justify-between items-center gap-2",
        "border-2 -m-0.5 border-dotted border-transparent cursor-pointer",
        editingId === `${index}` && "border-slate-100!",
      )}
      tabIndex={-1}
      role="button"
      onClick={(event) => {
        event.stopPropagation();
        dispatch(NodesActions.setEditing(`${index}`));
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        void lookAtNode();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          dispatch(NodesActions.setEditing(`${index}`));
        } else if (event.key === "Escape") {
          dispatch(NodesActions.setEditing(undefined));
        }
      }}
    >
      <span className="select-none">{index}</span>
    </div>
  );
}

export default RemovalsInstance;
