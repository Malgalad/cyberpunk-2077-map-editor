import { ChevronDown, Plus } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import type { DistrictData, Districts } from "../types.ts";

const getLabel = (district: DistrictData) =>
  district.isCustom
    ? district.name
    : DISTRICT_LABELS[district.name as keyof Districts];

function SelectDistrict() {
  const dispatch = useAppDispatch();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);

  return (
    <Dropdown
      trigger={
        <Button className="w-72 justify-between! border-none">
          <div className="w-full truncate">
            {district ? `Selected: ${getLabel(district)}` : "Select district"}
          </div>
          <ChevronDown className="shrink-0" />
        </Button>
      }
      align="right"
    >
      {districts.map((item) => (
        <DropdownItem
          key={item.name}
          className="max-w-96"
          checked={district?.name === item.name}
          onClick={() => dispatch(DistrictActions.selectDistrict(item.name))}
        >
          {getLabel(item)}
        </DropdownItem>
      ))}
      <DropdownSeparator />
      <DropdownItem
        icon={<Plus />}
        onClick={() => dispatch(ModalsActions.openModal("custom-district"))}
      >
        Create new district
      </DropdownItem>
    </Dropdown>
  );
}

export default SelectDistrict;
