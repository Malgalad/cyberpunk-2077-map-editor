import { produce } from "immer";
import { ArrowLeft } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import Select from "../components/common/Select.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { loadFileAsArrayBuffer } from "../helpers.ts";
import { useAppDispatch } from "../hooks.ts";
import mapData from "../mapData.min.json";
import { DistrictActions } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import type { Districts } from "../types.ts";

const items: Array<{ value: keyof Districts; label: string }> = Object.keys(
  mapData.soup,
).map((key) => ({
  value: key as keyof Districts,
  label: DISTRICT_LABELS[key as keyof Districts],
}));

function CustomDistrictModal() {
  const dispatch = useAppDispatch();
  const [district, setDistrict] =
    React.useState<keyof Districts>("city_center_data");
  const [name, setName] = React.useState<string>("Custom city_center_data");
  const [imageData, setImageData] = React.useState<ArrayBuffer | undefined>();
  const [districtData, setDistrictData] = React.useState(() =>
    structuredClone(mapData.soup[district]),
  );

  const onClose = () => {
    if (!imageData) return;

    dispatch(ModalsActions.closeModal());
    dispatch(
      DistrictActions.setDistrict({
        ...districtData,
        imageData,
        name,
      }),
    );
  };

  return (
    <Modal
      className="w-[800px]"
      title={
        <div className="flex flex-row gap-2 items-center">
          <Button
            className="font-normal text-base"
            onClick={() => {
              dispatch(ModalsActions.openModal("select-district"));
            }}
          >
            <ArrowLeft /> Return
          </Button>
          Create district to edit:
        </div>
      }
    >
      <div className="grid grid-cols-[120px_auto] items-center gap-2">
        <div>Template:</div>
        <div>
          <Select
            items={items}
            value={district}
            onChange={(event) => {
              const value = event.target.value as keyof Districts;
              setDistrict(value as keyof Districts);
              setName(`Custom ${value}`);
              setDistrictData(structuredClone(mapData.soup[value]));
            }}
          />
        </div>
        <div>Name:</div>
        <div>
          <Input
            key={district}
            type="text"
            value={name}
            onChange={() => setName(name)}
          />
        </div>
        <div>Position:</div>
        <div className="flex flex-row gap-2">
          {[0, 1, 2].map((i) => (
            <Input
              key={`${district}-${i}`}
              type="text"
              className="w-24"
              value={districtData.position[i]}
              onChange={(event) => {
                setDistrictData(
                  produce((draft) => {
                    draft.position[i] = parseFloat(event.target.value);
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>Orientation:</div>
        <div className="flex flex-row gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Input
              key={`${district}-${i}`}
              type="text"
              className="w-24"
              value={districtData.orientation[i]}
              onChange={(event) => {
                setDistrictData(
                  produce((draft) => {
                    draft.orientation[i] = parseFloat(event.target.value);
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>TransMin:</div>
        <div className="flex flex-row gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Input
              key={`${district}-${i}`}
              type="text"
              className="w-24"
              value={districtData.transMin[i]}
              onChange={(event) => {
                setDistrictData(
                  produce((draft) => {
                    draft.transMin[i] = parseFloat(event.target.value);
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>TransMax:</div>
        <div className="flex flex-row gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Input
              key={`${district}-${i}`}
              type="text"
              className="w-24"
              value={districtData.transMax[i]}
              onChange={(event) => {
                setDistrictData(
                  produce((draft) => {
                    draft.transMax[i] = parseFloat(event.target.value);
                  }),
                );
              }}
            />
          ))}
        </div>
        <div>CubeSize:</div>
        <div className="flex flex-row gap-2">
          <Input
            key={`${district}`}
            type="text"
            className="w-24"
            value={districtData.cubeSize}
            onChange={(event) =>
              setDistrictData(
                produce((draft) => {
                  draft.cubeSize = parseFloat(event.target.value);
                }),
              )
            }
          />
        </div>
        <div>Texture file:</div>
        <div>
          <Button
            onClick={async () => {
              const content = await loadFileAsArrayBuffer(".dds");
              setImageData(content);
            }}
          >
            Select file
          </Button>
        </div>
      </div>
      <div className="flex flex-row gap-2 justify-end">
        <Button onClick={() => onClose()}>Import</Button>
      </div>
    </Modal>
  );
}

export default CustomDistrictModal;
