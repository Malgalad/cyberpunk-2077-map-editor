import { BoxIcon } from "lucide-react";

import Button from "../components/common/Button.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import type { Map3D } from "../map3d/map3d.ts";

interface ResetButtonProps {
  map3d: Map3D | null;
}

function ResetButton(props: ResetButtonProps) {
  return (
    <Tooltip
      tooltip={"Reset camera [R]\nReset district [Shift+R]"}
      flow="right"
    >
      <Button
        className="absolute! bg-slate-800 left-4 top-4"
        onClick={(event) => {
          if (event.getModifierState("Shift"))
            props.map3d?.lookAtCurrentDistrict();
          else props.map3d?.resetCamera();
        }}
      >
        <BoxIcon />
      </Button>
    </Tooltip>
  );
}

export default ResetButton;
