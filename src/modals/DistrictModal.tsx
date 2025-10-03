import * as React from "react";

import Button from "../components/Button.tsx";
import Modal from "../components/Modal.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { useAppDispatch } from "../hooks.ts";
import mapData from "../mapData.min.json";
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

  return (
    <Modal className="w-[800px] h-[460px]" title={"Select district to edit:"}>
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
              onClick={() => dispatch(ModalsActions.closeModal(item.key))}
            >
              {item.label}
            </Button>
          ))}
          <Button className="col-span-2" disabled>
            Customize parameters <i className="lni lni-gear-1 align-middle" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DistrictModal;
