import * as THREE from "three";

import mapData from "../mapData.min.json";
import type { Districts } from "../types.ts";

function shorten(value: number) {
  return parseFloat(`${value.toFixed(4)}`);
}

interface DistrictInfoProps {
  district: keyof Districts;
  mesh: THREE.Mesh | null;
}

function DistrictInfo(props: DistrictInfoProps) {
  const district = mapData.soup[props.district];

  return (
    <div className="border border-slate-300 rounded-md p-2 flex flex-col gap-2 text-sm">
      <div>Position transform: {district.position.map(shorten).join(", ")}</div>
      <div className="flex flex-row gap-1 items-center">
        <div>Position range:</div>
        <div className="flex flex-col gap-1">
          <div>{district.transMin.map(shorten).join(", ")}</div>
          <div>{district.transMax.map(shorten).join(", ")}</div>
        </div>
      </div>
      <div>Cube size: {shorten(district.cubeSize)}</div>
      <div>Instances: {props.mesh?.count}</div>
    </div>
  );
}

export default DistrictInfo;
