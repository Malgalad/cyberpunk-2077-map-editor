import * as React from "react";

import { useAppSelector } from "../../hooks.ts";
import { DistrictSelectors } from "../../store/district.ts";
import type { District } from "../../types/types.ts";
import { getDistrictName } from "../../utilities/district.ts";
import { mapSize } from "./editDistrictModal.constants.ts";
import type {
  EditDistrictData,
  ErrorSlots,
} from "./editDistrictModal.types.ts";
import { fromData } from "./editDistrictModal.utils.ts";

const halfSize = mapSize / 2;
const ceiling = 1024;

export function useGetErrors(
  name: string,
  data: EditDistrictData,
  district: District | undefined,
) {
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const districtNames = React.useMemo(
    () => new Set(districts.map((d) => getDistrictName(d))),
    [districts],
  );
  const isEdit = !!district;
  const {
    position: pos,
    cubeSize,
    transMax: max,
    transMin: min,
  } = fromData(data);

  const errors = new Map<ErrorSlots, string>();

  if (isEdit && !district.isCustom) return errors;

  // Name
  if (name.length === 0) errors.set("name", "Name cannot be empty");
  else if (name.length > 40)
    errors.set("name", "Name cannot be longer than 40 characters");
  else if (districtNames.has(name) && (!isEdit || district.name !== name))
    errors.set("name", "District with this name already exists");

  // CubeSize
  if (cubeSize <= 0) errors.set("cubeSize", "Cube size must be greater than 0");
  else if (cubeSize > 512)
    errors.set("cubeSize", "Cube size must be less than 512");

  // Position X
  if (pos[0] + min[0] <= -halfSize || pos[0] + max[0] >= halfSize)
    errors.set("posX", "District must fit onto the map");
  else if (pos[0] <= -halfSize || pos[0] >= halfSize)
    errors.set("posX", "X position must be between -16000 and 16000");

  // Position Y
  if (pos[1] + min[1] <= -halfSize || pos[1] + max[1] >= halfSize)
    errors.set("posY", "District must fit onto the map");
  else if (pos[1] <= -halfSize || pos[1] >= halfSize)
    errors.set("posY", "Y position must be between -16000 and 16000");

  // Position Z
  if (pos[2] + min[2] <= -ceiling || pos[2] + max[2] >= ceiling)
    errors.set("posZ", "District must fit between -1024..1024 on Z axis");
  else if (pos[2] <= -ceiling || pos[2] >= ceiling)
    errors.set("posZ", "Z position must be between -1024 and 1024");

  // TransMin X
  if (min[0] <= -mapSize || min[0] >= mapSize)
    errors.set("minX", "TransMin X must be less than map size");

  // TransMin Y
  if (min[1] <= -mapSize || min[1] >= mapSize)
    errors.set("minY", "TransMin Y must be less than map size");

  // TransMin Z
  if (min[2] <= -ceiling || min[2] >= ceiling)
    errors.set("minZ", "TransMin Z must be between -1024 and 1024");

  // TransMax X
  if (max[0] <= -mapSize || max[0] >= mapSize)
    errors.set("maxX", "TransMax X must be less than map size");

  // TransMax Y
  if (max[1] <= -mapSize || max[1] >= mapSize)
    errors.set("maxY", "TransMax Y must be less than map size");

  // TransMax Z
  if (max[2] <= -ceiling || max[2] >= ceiling)
    errors.set("maxZ", "TransMax Z must be between -1024 and 1024");

  return errors;
}
