import { Clipboard } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { getDistrictInstancedMeshTransforms } from "../store/district.selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { getNodesInstancedMeshTransforms } from "../store/nodes.selectors.ts";
import { invariant } from "../utilities.ts";

const axii = [0, 1, 2] as const;

function DistrictInfoModal() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districtInstancedMeshTransforms = useAppSelector(
    getDistrictInstancedMeshTransforms,
  );
  const nodesInstancedMeshTransforms = useAppSelector(
    getNodesInstancedMeshTransforms,
  );
  const height = React.useMemo(() => {
    const length =
      districtInstancedMeshTransforms.filter((instance) => !instance.hidden)
        .length + nodesInstancedMeshTransforms.length;

    return Math.ceil(Math.sqrt(length));
  }, [districtInstancedMeshTransforms, nodesInstancedMeshTransforms]);
  const [copied, setCopied] = React.useState<boolean>(false);

  invariant(district, "District is not set");

  return (
    <Modal className="w-auto" title={`District ${district.name} properties`}>
      <div className="grid grid-cols-2 gap-2">
        <div>Name:</div>
        <div>
          <Input value={district.name} readOnly />
        </div>
        <div>Position:</div>
        <div className="flex flex-row gap-2">
          {axii.map((i) => (
            <Input
              key={i}
              className="w-20"
              value={district.position[i]}
              readOnly
            />
          ))}
        </div>
        <div>TransMin:</div>
        <div className="flex flex-row gap-2">
          {axii.map((i) => (
            <Input
              key={i}
              className="w-20"
              value={district.transMin[i]}
              readOnly
            />
          ))}
        </div>
        <div>TransMax:</div>
        <div className="flex flex-row gap-2">
          {axii.map((i) => (
            <Input
              key={i}
              className="w-20"
              value={district.transMax[i]}
              readOnly
            />
          ))}
        </div>
        <div>CubeSize:</div>
        <div>
          <Input className="w-20" value={district.cubeSize} readOnly />
        </div>
        <div>Texture Height:</div>
        <div>
          <Input className="w-20" value={height} readOnly />
        </div>
        <div className="justify-self-end col-span-2 flex flex-row gap-4">
          <Button
            className="tooltip"
            onClick={() => {
              const { name, position, transMin, transMax, cubeSize } = district;
              const positionFP = position.map((v) => v * (1 << 17));
              const data = JSON.stringify(
                {
                  name,
                  Position: position,
                  "Position (floating point bits)": positionFP,
                  PointCloudTextureHeight: height,
                  TransMin: transMin,
                  TransMax: transMax,
                  CubeSize: cubeSize,
                },
                null,
                2,
              );
              navigator.clipboard.writeText(data).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1000);
              });
            }}
            data-tooltip={copied ? "Copied!" : "Copy to clipboard"}
            data-flow="top"
          >
            <Clipboard />
          </Button>
          <Button onClick={() => dispatch(ModalsActions.closeModal())}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DistrictInfoModal;
