import { produce } from "immer";
import { AlertTriangle, LockKeyhole, XIcon } from "lucide-react";
import { nanoid } from "nanoid";
import * as React from "react";

import Button from "../../components/common/Button.tsx";
import DraggableInput from "../../components/common/DraggableInput.tsx";
import Input from "../../components/common/Input.tsx";
import Modal from "../../components/common/Modal.tsx";
import Tooltip from "../../components/common/Tooltip.tsx";
import { AXII, AXIS_LABELS } from "../../constants.ts";
import { useAppDispatch, useAppSelector } from "../../hooks/hooks.ts";
import { decodeImageData } from "../../map3d/processDDS.ts";
import { DistrictActions, DistrictSelectors } from "../../store/district.ts";
import { ModalsActions } from "../../store/modals.ts";
import type { ModalProps } from "../../types/modals.ts";
import type { District, DistrictProperties } from "../../types/types.ts";
import {
  computeDistrictProperties,
  getDistrictName,
  immutableDistrictTransforms,
} from "../../utilities/district.ts";
import { uploadFileByExtensions } from "../../utilities/fileHelpers.ts";
import { fs } from "../../utilities/opfs.ts";
import { unclampTransform } from "../../utilities/transforms.ts";
import { invariant, toNumber } from "../../utilities/utilities.ts";
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
  const [resolvedTextureName, setResolvedTextureName] = React.useState<string>(
    district?.texture?.replace(".xbm", ".dds") ?? "",
  );
  const [textureToUpload, setTextureToUpload] = React.useState<File | null>();

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

  React.useEffect(() => {
    if (!isCustomDistrict || !district?.texture) return;
    fs.readFile(
      "textures/" + district.texture.replace(".dds", ".info.txt"),
      "utf-8",
    ).then((name) => setResolvedTextureName(name));
  }, [isCustomDistrict, district]);

  const saveTexture = async (district: District, name: string, file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(
      "/textures/" + name.replace(".dds", ".info.txt"),
      file.name,
      "utf-8",
    );
    await fs.writeFile("/textures/" + name, arrayBuffer, "binary");
    const transforms = decodeImageData(
      new Uint16Array<ArrayBufferLike>(arrayBuffer),
    );
    const unclampedTransforms = transforms.map(unclampTransform(district));

    immutableDistrictTransforms.set(district.name, unclampedTransforms);
  };

  const createDistrict = async () => {
    const computedProperties = computeDistrictProperties(
      data,
      district
        ? (immutableDistrictTransforms.get(district.name)?.length ?? 0)
        : 0,
    );
    const next: District = {
      ...data,
      ...computedProperties,
    };

    dispatch(ModalsActions.closeModal());
    if (isEdit) {
      if (district && isCustomDistrict) {
        if (data.texture && textureToUpload) {
          await saveTexture(district, data.texture, textureToUpload);
        }
        if (district.texture) {
          await fs.unlink("/textures/" + district.texture);
          if (!data.texture) {
            immutableDistrictTransforms.set(district.name, []);
          }
        }
      }
      dispatch(
        DistrictActions.updateDistrict({
          name: district!.name,
          district: next,
        }),
      );
    } else {
      if (data.texture && textureToUpload) {
        await saveTexture(next, data.texture, textureToUpload);
      } else {
        immutableDistrictTransforms.set(data.name, []);
      }
      dispatch(DistrictActions.addDistrict(next));
      dispatch(DistrictActions.selectDistrict(data.name));
    }
  };

  const uploadTexture = React.useCallback(async () => {
    if (!isCustomDistrict || !district) return;
    const file = await uploadFileByExtensions(".dds");
    const id = nanoid();
    setTextureToUpload(file);
    setData((data) => ({ ...data, texture: id + ".dds" }));
    setResolvedTextureName(file.name);
  }, [district, isCustomDistrict]);

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

          <div>Texture:</div>
          <div className="flex flex-row gap-2 items-center">
            <Button
              className="shrink-0"
              disabled={!isCustomDistrict}
              onClick={() => uploadTexture()}
            >
              Select file
            </Button>
            <div className="overflow-hidden overflow-ellipsis">
              {resolvedTextureName || "None"}
            </div>
            {data.texture && (
              <Button
                onClick={() => {
                  setTextureToUpload(null);
                  setResolvedTextureName("");
                  if (data.isCustom) setData({ ...data, texture: undefined });
                }}
                disabled={!isCustomDistrict}
              >
                <XIcon />
              </Button>
            )}
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
