import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { getDistrictInstancedMeshTransforms } from "../store/district.selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { clsx, lookAtTransform } from "../utilities.ts";

interface RemovalsInstanceProps {
  index: number;
}

function RemovalsInstance({ index }: RemovalsInstanceProps) {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const editingId = useAppSelector(NodesSelectors.getEditingId);
  const transforms = useAppSelector(getDistrictInstancedMeshTransforms);
  const districtCenter = useAppSelector(DistrictSelectors.getDistrictCenter);

  const lookAtNode = () => {
    if (!map3d || !districtCenter) return;

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
        lookAtNode();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          dispatch(NodesActions.setEditing(`${index}`));
        } else if (event.key === "Escape") {
          dispatch(NodesActions.setEditing(null));
        }
      }}
    >
      <span className="select-none">{index}</span>
    </div>
  );
}

export default RemovalsInstance;
