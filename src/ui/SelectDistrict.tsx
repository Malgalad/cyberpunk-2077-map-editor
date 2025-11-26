import { ChevronDown, Plus, Trash2 } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { DistrictProperties, GroupNodeCache } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";

const getEdits = (cache: GroupNodeCache, district: DistrictProperties) => {
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
        <Button className="w-64 justify-between! border-none">
          <div className="w-full truncate text-left">
            {district
              ? `Selected: ${getDistrictName(district)}`
              : "Select district"}
          </div>
          <ChevronDown className="shrink-0" />
        </Button>
      }
      align="right"
      disabled={!project}
    >
      {districts.map((item) => {
        const element = (
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
              {getDistrictName(item)}
              {getEdits(cache, item)}
            </div>
          </DropdownItem>
        );

        if (item.isCustom) {
          const districtCache = cache[item.name];
          const disableDelete =
            districtCache?.i.length > 0 || districtCache?.g.length > 0;

          return (
            <Dropdown
              className="min-w-auto!"
              key={item.name}
              trigger={element}
              level={1}
              direction="left"
              align="top"
            >
              <DropdownItem
                className={disableDelete ? "tooltip" : ""}
                icon={<Trash2 />}
                disabled={disableDelete}
                onClick={async () => {
                  const confirmed = await dispatch(
                    ModalsActions.openModal(
                      "confirm",
                      `Do you want to delete custom district "${item.name}"?`,
                    ),
                  );
                  if (confirmed) {
                    dispatch(DistrictActions.deleteDistrict(item.name));
                  }
                }}
                data-tooltip="Can not delete district with nodes"
                data-flow="top"
              >
                Delete district
              </DropdownItem>
            </Dropdown>
          );
        }

        return element;
      })}
      <DropdownSeparator />
      <DropdownItem
        icon={<Plus />}
        onClick={() =>
          void dispatch(ModalsActions.openModal("edit-district", false))
        }
      >
        Create new district
      </DropdownItem>
    </Dropdown>
  );
}

export default SelectDistrict;
