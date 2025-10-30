import { ChevronDown, Plus } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { DefaultDistricts, DistrictData } from "../types/types.ts";

const getLabel = (district: DistrictData) =>
  district.isCustom
    ? district.name
    : DISTRICT_LABELS[district.name as DefaultDistricts];

// TODO show number of edits in district (+5 ~3 -10)
function SelectDistrict() {
  const dispatch = useAppDispatch();
  const project = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);

  return (
    <Dropdown
      trigger={
        <Button className="w-72 justify-between! border-none">
          <div className="w-full truncate text-left">
            {district ? `Selected: ${getLabel(district)}` : "Select district"}
          </div>
          <ChevronDown className="shrink-0" />
        </Button>
      }
      align="right"
      disabled={!project}
    >
      {districts.map((item) => (
        <DropdownItem
          key={item.name}
          className="max-w-96"
          checked={district?.name === item.name}
          onClick={() => {
            dispatch(DistrictActions.selectDistrict(item.name));
            dispatch(NodesActions.setEditing(null));
            if (item.isCustom) dispatch(ProjectActions.setMode("create"));
          }}
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
