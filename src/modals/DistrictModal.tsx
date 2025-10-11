import { HardDriveUpload, HelpCircle, MapPlus } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import { DISTRICTS } from "../constants.ts";
import { loadURLAsArrayBuffer } from "../helpers.ts";
import { useAppDispatch } from "../hooks.ts";
import { useLoadProject } from "../hooks/importExport.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import mapData from "../mapData.min.json";
import { DistrictActions } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions } from "../store/nodes.ts";
import type { DistrictData, Districts } from "../types.ts";

function DistrictModal() {
  const dispatch = useAppDispatch();
  const [hovering, setHovering] = React.useState<keyof Districts | undefined>(
    undefined,
  );
  const loadProject = useLoadProject();

  const onClickDistrict = async (name: keyof Districts) => {
    const district = mapData.soup[name];
    const imageData = await loadURLAsArrayBuffer(
      `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
    );
    const data = {
      ...district,
      imageData,
      isCustom: false,
      name,
    } satisfies DistrictData as DistrictData;
    dispatch(ModalsActions.closeModal());
    dispatch(DistrictActions.setDistrict(data));
    dispatch(NodesActions.setNodes([]));
    dispatch(NodesActions.setRemovals([]));
  };

  return (
    <Modal
      className="w-[800px] h-[460px]"
      title={
        <div className="flex flex-row justify-between items-center">
          <div>Select district to work with:</div>
          <div
            className="tooltip text-base font-normal"
            data-tooltip="All buildings are positioned relative to district bounding box and origin. Select existing district to edit it, or create a new one."
            data-flow="left"
          >
            <HelpCircle />
          </div>
        </div>
      }
    >
      <div className="flex flex-row">
        <div className="flex-1/2 aspect-square">
          <img
            src={`${import.meta.env.BASE_URL}${hovering ?? "none"}.jpg`}
            alt="Preview"
            className="w-full h-full"
          />
        </div>
        <div className="flex-1/2 p-4 grid grid-cols-2 gap-2">
          <Button
            className="col-span-2 tooltip"
            onClick={async () => {
              await loadProject();
              dispatch(ModalsActions.closeModal());
            }}
            data-tooltip="Load previously saved custom or existing district"
            data-flow="top"
          >
            <HardDriveUpload /> Load district
          </Button>
          <div className="col-span-2 border-b border-gray-200 h-[1px] self-center" />
          {DISTRICTS.map((item) => (
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
            className="col-span-2 tooltip"
            onClick={() => {
              dispatch(ModalsActions.openModal("custom-district"));
            }}
            data-tooltip="Create a new district if new buildings won't fit into constraints of existing one"
            data-flow="top"
          >
            <MapPlus /> Create new
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DistrictModal;
