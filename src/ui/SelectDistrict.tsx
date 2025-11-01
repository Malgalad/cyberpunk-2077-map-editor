import { ChevronDown, Plus } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { DISTRICT_LABELS } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type {
  DefaultDistricts,
  DistrictData,
  GroupNodeCache,
} from "../types/types.ts";

const getLabel = (district: DistrictData) =>
  district.isCustom
    ? district.name
    : DISTRICT_LABELS[district.name as DefaultDistricts];
const getEdits = (cache: GroupNodeCache, district: DistrictData) => {
  const cachedDistrict = cache[district.name];

  if (!cachedDistrict) return null;

  return (
    <div className="flex flex-row gap-0.5 text-sm &:empty:hidden">
      {cachedDistrict.c.length > 0 && (
        <div className="text-green-400">+{cachedDistrict.c.length}</div>
      )}
      {cachedDistrict.u.length > 0 && (
        <div className="text-yellow-400">~{cachedDistrict.u.length}</div>
      )}
      {cachedDistrict.d.length > 0 && (
        <div className="text-red-400">-{cachedDistrict.d.length}</div>
      )}
    </div>
  );
};

function SelectDistrict() {
  const dispatch = useAppDispatch();
  const project = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);

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
          <div className="flex flex-row gap-4 items-baseline justify-between">
            {getLabel(item)}
            {getEdits(cache, item)}
          </div>
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
