import { produce } from "immer";
import { HelpCircle, LockKeyhole } from "lucide-react";
import * as React from "react";

import Button from "../../components/common/Button.tsx";
import DraggableInput from "../../components/common/DraggableInput.tsx";
import Input from "../../components/common/Input.tsx";
import Modal from "../../components/common/Modal.tsx";
import { useAppDispatch, useAppSelector } from "../../hooks.ts";
import { DistrictActions, DistrictSelectors } from "../../store/district.ts";
import { ModalsActions } from "../../store/modals.ts";
import type { ModalProps } from "../../types/modals.ts";
import type {
  DistrictProperties,
  InstancedMeshTransforms,
} from "../../types/types.ts";
import {
  computeDistrictProperties,
  getDistrictName,
} from "../../utilities/district.ts";
import { invariant, toNumber } from "../../utilities/utilities.ts";
import EditDistrictModalClipboard from "./EditDistrictModal.Clipboard.tsx";
import { defaultValues } from "./editDistrictModal.constants.ts";
import {
  useDistrictTextureHeight,
  useDrawOnCanvas,
} from "./editDistrictModal.hooks.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";
import { toData } from "./editDistrictModal.utils.ts";
import { useGetErrors } from "./editDistrictModal.validation.ts";

const axii = [0, 1, 2] as const;
const axiiNames = ["X", "Y", "Z"] as const;

function EditDistrictModal(props: ModalProps) {
  const isEdit = props.data as boolean;
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);

  if (isEdit) {
    invariant(district, "District must be selected to edit it");
  }

  const height = useDistrictTextureHeight(district);
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [data, setData] = React.useState<EditDistrictData>(
    isEdit ? toData(district!) : defaultValues,
  );
  const [name, setName] = React.useState<string>(
    isEdit ? getDistrictName(district!) : "my_district",
  );

  const validationErrors = useGetErrors(
    name.trim(),
    data,
    isEdit ? district : undefined,
  );
  const isCustomDistrict = district?.isCustom;
  const isValid = !validationErrors.size;

  const redrawCanvasRefFn = useDrawOnCanvas(ref, [data, setData]);

  React.useEffect(() => {
    redrawCanvasRefFn.current?.(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const createDistrict = () => {
    const districtProperties: DistrictProperties = {
      name,
      isCustom: true,
      position: data.pos.map(toNumber),
      orientation: [0, 0, 0, 1],
      transMin: [...data.min.map(toNumber), 0],
      transMax: [...data.max.map(toNumber), 1],
      cubeSize: toNumber(data.cubeSize),
    };
    const computedProperties = computeDistrictProperties(districtProperties);
    const transforms: InstancedMeshTransforms[] = isEdit
      ? district!.transforms
      : [];

    dispatch(ModalsActions.closeModal());
    if (isEdit) {
      dispatch(
        DistrictActions.updateDistrict({
          name: district!.name,
          district: {
            ...districtProperties,
            ...computedProperties,
            transforms,
          },
        }),
      );
    } else {
      dispatch(
        DistrictActions.addDistrict({
          ...districtProperties,
          ...computedProperties,
          transforms,
        }),
      );
      dispatch(DistrictActions.selectDistrict(name));
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
            ref={ref}
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
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              readOnly={isEdit && !isCustomDistrict}
            />
          </div>

          <div>Position:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                aria-invalid={validationErrors.has(`pos${axiiNames[i]}`)}
                aria-errormessage={validationErrors.get(`pos${axiiNames[i]}`)}
                className="w-20"
                value={data.pos[i]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.pos[i] = event.target.value;
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
            {axii.map((i) => (
              <DraggableInput
                key={i}
                aria-invalid={validationErrors.has(`min${axiiNames[i]}`)}
                aria-errormessage={validationErrors.get(`min${axiiNames[i]}`)}
                className="w-20"
                value={data.min[i]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.min[i] = event.target.value;
                    }),
                  );
                }}
                readOnly={isEdit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>TransMax:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                aria-invalid={validationErrors.has(`max${axiiNames[i]}`)}
                aria-errormessage={validationErrors.get(`max${axiiNames[i]}`)}
                className="w-20"
                value={data.max[i]}
                onChange={(event) => {
                  setData(
                    produce((draft) => {
                      draft.max[i] = event.target.value;
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
                    draft.cubeSize = event.target.value;
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
              <div className="flex flex-row gap-2 items-center">
                Texture Height:
                <span
                  className="tooltip"
                  data-tooltip="Projected dimensions of the texture required to encode all nodes"
                  data-flow="top"
                >
                  <HelpCircle />
                </span>
              </div>
              <div>
                <Input className="w-20" value={height} readOnly />
              </div>
            </>
          )}

          <div className="flex flex-row gap-2 mt-auto justify-end">
            {isEdit && (
              <EditDistrictModalClipboard
                name={name}
                data={data}
                height={height}
              />
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
