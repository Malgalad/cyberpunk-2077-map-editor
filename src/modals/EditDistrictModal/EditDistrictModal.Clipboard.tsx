import { Clipboard } from "lucide-react";

import Button from "../../components/common/Button.tsx";
import Tooltip from "../../components/common/Tooltip.tsx";
import type { DistrictProperties } from "../../types/types.ts";

interface EditDistrictModalClipboardProps {
  data: DistrictProperties;
  height: number;
}

function EditDistrictModalClipboard(props: EditDistrictModalClipboardProps) {
  const { data, height } = props;

  return (
    <Tooltip
      tooltip="Copy properties to clipboard"
      flow="top"
      tooltip2="Copied!"
    >
      <Button
        onClick={async () => {
          const content = {
            name: data.name,
            Position: data.position,
            "Position (floating point bits)": data.position.map(
              (v) => v * (1 << 17),
            ),
            PointCloudTextureHeight: height,
            TransMin: data.transMin,
            TransMax: data.transMax,
            CubeSize: data.cubeSize,
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
