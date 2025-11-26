import { Clipboard } from "lucide-react";
import * as React from "react";

import Button from "../../components/common/Button.tsx";
import { toNumber } from "../../utilities/utilities.ts";
import type { EditDistrictData } from "./editDistrictModal.types.ts";

interface EditDistrictModalClipboardProps {
  name: string;
  data: EditDistrictData;
  height: number;
}

function EditDistrictModalClipboard(props: EditDistrictModalClipboardProps) {
  const { name, data, height } = props;
  const [copied, setCopied] = React.useState<boolean>(false);

  return (
    <Button
      className="tooltip"
      onClick={() => {
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
        navigator.clipboard
          .writeText(JSON.stringify(content, null, 2))
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          });
      }}
      data-tooltip={copied ? "Copied!" : "Copy properties to clipboard"}
      data-flow="top"
    >
      <Clipboard />
    </Button>
  );
}

export default EditDistrictModalClipboard;
