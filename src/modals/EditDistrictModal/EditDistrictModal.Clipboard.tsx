import { Clipboard } from "lucide-react";

import Button from "../../components/common/Button.tsx";
import Tooltip from "../../components/common/Tooltip.tsx";
import { toNumber } from "../../utilities/utilities.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";

interface EditDistrictModalClipboardProps {
  name: string;
  data: EditDistrictData;
  height: number;
}

function EditDistrictModalClipboard(props: EditDistrictModalClipboardProps) {
  const { name, data, height } = props;

  return (
    <Tooltip
      tooltip="Copy properties to clipboard"
      flow="top"
      tooltip2="Copied!"
    >
      <Button
        onClick={async () => {
          const content = {
            name,
            Position: data.pos.map(toNumber),
            "Position (floating point bits)": data.pos
              .map(toNumber)
              .map((v) => v * (1 << 17)),
            PointCloudTextureHeight: height,
            TransMin: data.min.map(toNumber),
            TransMax: data.max.map(toNumber),
            CubeSize: toNumber(data.cubeSize),
          };
          await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
        }}
      >
        <Clipboard />
      </Button>
    </Tooltip>
  );
}

export default EditDistrictModalClipboard;
