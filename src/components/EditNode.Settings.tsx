import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { OptionsActions, OptionsSelectors } from "../store/options.ts";
import Toggle from "./common/Toggle.tsx";

function EditNodeSettings() {
  const adjustZPosition = useAppSelector(OptionsSelectors.getAdjustZPosition);
  const dispatch = useAppDispatch();

  return (
    <div className="grow bg-slate-800">
      <div className="flex flex-col gap-4 p-2">
        <div className="flex flex-row gap-2 items-center">
          <div>Sticky bottom</div>
          <Toggle
            enabled={!!adjustZPosition}
            onChange={() =>
              dispatch(OptionsActions.toggleZAdjustment(!adjustZPosition))
            }
          />
        </div>
        <div className="text-sm pl-4">
          Adjust node's Z position based on its scale, so that its bottom face
          (or edge!) stays at the same level.
        </div>
      </div>
    </div>
  );
}

export default EditNodeSettings;
