import { Settings } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { loadURLAsArrayBuffer } from "../helpers.ts";
import { useAppDispatch } from "../hooks.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import mapData from "../mapData.min.json";
import { DistrictActions } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import type { Districts } from "../types.ts";

const items: Array<{ key: keyof Districts; label: React.ReactNode }> =
  Object.keys(mapData.soup).map((key) => ({
    key: key as keyof Districts,
    label: DISTRICT_LABELS[key as keyof Districts],
  }));

function DistrictModal() {
  const dispatch = useAppDispatch();
  const [hovering, setHovering] = React.useState<keyof Districts | undefined>(
    undefined,
  );
  const src = `${import.meta.env.BASE_URL}${hovering ?? "none"}.jpg`;

  const onClickDistrict = async (key: keyof Districts) => {
    const district = mapData.soup[key];
    const imageData = await loadURLAsArrayBuffer(
      `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
    );
    const data = {
      ...district,
      imageData,
      name: key,
    };
    dispatch(ModalsActions.closeModal());
    dispatch(DistrictActions.setDistrict(data));
  };

  return (
    <Modal className="w-[800px] h-[460px]" title="Select district to edit:">
      <div className="flex flex-row">
        <div className="flex-1/2 aspect-square">
          <img src={src} alt="Preview" className="w-full h-full" />
        </div>
        <div className="flex-1/2 p-4 grid grid-cols-2 gap-2">
          {items.map((item) => (
            <Button
              key={item.key}
              onMouseOver={() => setHovering(item.key)}
              onMouseOut={() => setHovering(undefined)}
              onClick={() => onClickDistrict(item.key)}
            >
              {item.label}
            </Button>
          ))}
          <Button
            className="col-span-2"
            onClick={() => {
              dispatch(ModalsActions.openModal("custom-district"));
            }}
          >
            Customize parameters <Settings />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DistrictModal;
