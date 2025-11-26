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
  District,
  DistrictProperties,
  InstancedMeshTransforms,
} from "../../types/types.ts";
import {
  computeDistrictProperties,
  getDistrictName,
} from "../../utilities/district.ts";
import { invariant, toNumber, toString } from "../../utilities/utilities.ts";
import EditDistrictModalClipboard from "./editDistrictModal.clipboard.tsx";
import { defaultValues } from "./editDistrictModal.constants.ts";
import {
  useDistrictTextureHeight,
  useDrawOnCanvas,
} from "./editDistrictModal.hooks.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";

const axii = [0, 1, 2] as const;
const getValues = (district: District) => ({
  pos: district.position.map((n) => toString(n)),
  min: district.transMin.map((n) => toString(n)),
  max: district.transMax.map((n) => toString(n)),
  cubeSize: toString(district.cubeSize),
});

function EditDistrictModal(props: ModalProps) {
  const edit = props.data as boolean;
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);

  invariant(district, "District is not defined");

  const height = useDistrictTextureHeight(district);
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [data, setData] = React.useState<EditDistrictData>(
    edit ? getValues(district) : defaultValues,
  );
  const [name, setName] = React.useState<string>(
    edit ? getDistrictName(district) : "my_district",
  );

  const redrawCanvasRefFn =
    React.useRef<(current: EditDistrictData) => void>(null);
  // TODO validation of values
  const validationErrors = (() => {
    if (name.length === 0) return "Name cannot be empty";
    if (name.length > 40) return "Name cannot be longer than 40 characters";
    return "";
  })();
  const isCustomDistrict = district.isCustom;
  const isValid = !validationErrors;

  useDrawOnCanvas(ref, redrawCanvasRefFn, [data, setData]);

  React.useEffect(() => {
    redrawCanvasRefFn.current?.(data);
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
    const transforms: InstancedMeshTransforms[] = edit
      ? district.transforms
      : [];

    dispatch(ModalsActions.closeModal());
    if (edit) {
      dispatch(
        DistrictActions.updateDistrict({
          name: district.name,
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
        edit ? `Edit district "${district.name}":` : `Create new district:`
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
              {!isCustomDistrict && (
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
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              readOnly={edit && !isCustomDistrict}
            />
          </div>

          <div>Position:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.pos[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.pos[i] = value;
                    }),
                  );
                }}
                readOnly={edit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>TransMin:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.min[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.min[i] = value;
                    }),
                  );
                }}
                readOnly={edit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>TransMax:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.max[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.max[i] = value;
                    }),
                  );
                }}
                readOnly={edit && !isCustomDistrict}
              />
            ))}
          </div>

          <div>CubeSize:</div>
          <div>
            <DraggableInput
              className="w-20"
              value={data.cubeSize}
              onChange={(value) => {
                setData(
                  produce((draft) => {
                    draft.cubeSize = value;
                  }),
                );
              }}
              readOnly={edit && !isCustomDistrict}
            />
          </div>

          {edit && (
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
            {edit && (
              <EditDistrictModalClipboard
                name={name}
                data={data}
                height={height}
              />
            )}

            {!edit ||
              (isCustomDistrict && (
                <Button onClick={() => createDistrict()} disabled={!isValid}>
                  {edit ? "Update district" : "Crate new district"}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EditDistrictModal;
