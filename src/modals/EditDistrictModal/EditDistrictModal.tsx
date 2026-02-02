import { produce } from "immer";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import * as React from "react";

import Button from "../../components/common/Button.tsx";
import DraggableInput from "../../components/common/DraggableInput.tsx";
import Input from "../../components/common/Input.tsx";
import Modal from "../../components/common/Modal.tsx";
import Tooltip from "../../components/common/Tooltip.tsx";
import { AXII, AXIS_LABELS } from "../../constants.ts";
import { useAppDispatch, useAppSelector } from "../../hooks/hooks.ts";
import { DistrictActions, DistrictSelectors } from "../../store/district.ts";
import { ModalsActions } from "../../store/modals.ts";
import type { ModalProps } from "../../types/modals.ts";
import type { DistrictProperties } from "../../types/types.ts";
import {
  computeDistrictProperties,
  getDistrictName,
  immutableDistrictTransforms,
} from "../../utilities/district.ts";
import { invariant, toNumber } from "../../utilities/utilities.ts";
import EditDistrictModalClipboard from "./EditDistrictModal.Clipboard.tsx";
import { defaultValues } from "./editDistrictModal.constants.ts";
import {
  useDistrictTextureHeight,
  useDrawOnCanvas,
} from "./editDistrictModal.hooks.ts";
import { useGetErrors } from "./editDistrictModal.validation.ts";

function EditDistrictModal(props: ModalProps) {
  const isEdit = props.data as boolean;
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);

  if (isEdit) {
    invariant(district, "District must be selected to edit it");
  }

  const height = useDistrictTextureHeight(district);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [data, setData] = React.useState<DistrictProperties>(
    isEdit ? { ...district!, name: getDistrictName(district!) } : defaultValues,
  );

  const validationErrors = useGetErrors(data, isEdit ? district : undefined);
  const isCustomDistrict = isEdit ? district?.isCustom : true;
  const isValid = !validationErrors.size;

  const redrawCanvasRefFn = useDrawOnCanvas(
    canvasRef,
    [data, setData],
    !isCustomDistrict,
  );

  React.useEffect(() => {
    if (!isCustomDistrict) return;
    redrawCanvasRefFn.current?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isCustomDistrict]);

  const createDistrict = () => {
    const computedProperties = computeDistrictProperties(
      data,
      district
        ? (immutableDistrictTransforms.get(district.name)?.length ?? 0)
        : 0,
    );

    dispatch(ModalsActions.closeModal());
    if (isEdit) {
      dispatch(
        DistrictActions.updateDistrict({
          name: district!.name,
          district: {
            ...data,
            ...computedProperties,
          },
        }),
      );
    } else {
      immutableDistrictTransforms.set(data.name, []);
      dispatch(
        DistrictActions.addDistrict({
          ...data,
          ...computedProperties,
        }),
      );
      dispatch(DistrictActions.selectDistrict(data.name));
    }
  };

  return (
    <Modal
      className="w-[858px]"
      title={
        isEdit
          ? `Edit district "${getDistrictName(district!)}":`
          : `Create new district:`
      }
    >
      <div className="flex flex-row gap-4">
        <div className="w-[512px] aspect-square shrink-0">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="w-full h-full"
          />
        </div>

        <div className="flex flex-col gap-2 grow">
          <div className="flex flex-row justify-between items-center">
            <div className="text-lg font-bold flex flex-row gap-2 items-center">
              District properties
              {isEdit && !isCustomDistrict && (
                <span
                  className="tooltip"
                  data-tooltip="Default district properties cannot be edited"
                  data-flow="top"
                >
                  <LockKeyhole />
                </span>
              )}
            </div>
          </div>

          <div>Name:</div>
          <div>
            <Input
              aria-invalid={validationErrors.has("name")}
              aria-errormessage={validationErrors.get("name")}
              value={data.name}
              maxLength={40}
              onChange={(event) => {
                setData(
                  produce((draft) => {
                    draft.name = event.target.value;
                  }),
                );
              }}
              readOnly={isEdit && !isCustomDistrict}
            />
          </div>

          <div>Position:</div>
          <div className="flex flex-row gap-2">
            {AXII.map((axis) => (
              <DraggableInput
                key={axis}
                aria-invalid={validationErrors.has(`pos${AXIS_LABELS[axis]}`)}
                aria-errormessage={validationErrors.get(
                  `pos${AXIS_LABELS[axis]}`,
                )}
                className="w-20"
                value={data.position[axis]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.position[axis] = toNumber(event.target.value);
                    }),
                  );
                }}
                readOnly={isEdit && !isCustomDistrict}
                max={8_000}
                min={-8_000}
              />
            ))}
          </div>

          <div>TransMin:</div>
          <div className="flex flex-row gap-2">
            {AXII.map((axis) => (
              <DraggableInput
                key={axis}
                aria-invalid={validationErrors.has(`min${AXIS_LABELS[axis]}`)}
                aria-errormessage={validationErrors.get(
                  `min${AXIS_LABELS[axis]}`,
                )}
                className="w-20"
                value={data.transMin[axis]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.transMin[axis] = toNumber(event.target.value);
                    }),
                  );
                }}
                readOnly={isEdit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>TransMax:</div>
          <div className="flex flex-row gap-2">
            {AXII.map((axis) => (
              <DraggableInput
                key={axis}
                aria-invalid={validationErrors.has(`max${AXIS_LABELS[axis]}`)}
                aria-errormessage={validationErrors.get(
                  `max${AXIS_LABELS[axis]}`,
                )}
                className="w-20"
                value={data.transMax[axis]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.transMax[axis] = toNumber(event.target.value);
                    }),
                  );
                }}
                readOnly={isEdit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>CubeSize:</div>
          <div>
            <DraggableInput
              aria-invalid={validationErrors.has("cubeSize")}
              aria-errormessage={validationErrors.get("cubeSize")}
              className="w-20"
              value={data.cubeSize}
              onChange={(event) => {
                setData(
                  produce((draft) => {
                    draft.cubeSize = toNumber(event.target.value);
                  }),
                );
              }}
              readOnly={isEdit && !isCustomDistrict}
              min={1}
              max={1000}
            />
          </div>

          {isEdit && (
            <>
              <div>Texture Height:</div>
              <div className="flex flex-row gap-2 items-center">
                <Input className="w-20" value={height} readOnly />
                {` / ${district?.height ?? 0}`}
                {district &&
                  !district.isCustom &&
                  height > (district.height ?? 0) && (
                    <Tooltip
                      tooltip="District texture height is greater than the original height"
                      flow="top"
                    >
                      <div>
                        <AlertTriangle className="text-red-500" />
                      </div>
                    </Tooltip>
                  )}
              </div>
            </>
          )}

          <div className="flex flex-row gap-2 mt-auto justify-end">
            {isEdit && (
              <EditDistrictModalClipboard data={data} height={height} />
            )}

            <Button
              onClick={() => createDistrict()}
              disabled={!isValid || (isEdit && !isCustomDistrict)}
            >
              {isEdit ? "Update district" : "Crate new district"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EditDistrictModal;
