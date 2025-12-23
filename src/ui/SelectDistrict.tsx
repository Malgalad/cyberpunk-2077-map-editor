import { ChevronDown, Plus, Trash2, TriangleAlert } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { GroupNodeCache } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";

const getEdits = (cachedDistrict: GroupNodeCache[string]) => {
  if (!cachedDistrict) return null;

  return (
    <div className="flex flex-row gap-0.5 text-sm &:empty:hidden">
      {cachedDistrict.additions.length > 0 && (
        <div className="text-green-400">+{cachedDistrict.additions.length}</div>
      )}
      {cachedDistrict.updates.length > 0 && (
        <div className="text-yellow-400">~{cachedDistrict.updates.length}</div>
      )}
      {cachedDistrict.deletions.length > 0 && (
        <div className="text-red-400">-{cachedDistrict.deletions.length}</div>
      )}
    </div>
  );
};

function SelectDistrict() {
  const map3d = useMap3D();
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
          <div className="flex flex-row gap-1 items-center">
            {((district && cache[district.name]?.errors.length) ?? 0) > 0 && (
              <TriangleAlert className="text-red-500" />
            )}
            <ChevronDown className="shrink-0" />
          </div>
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
              dispatch(NodesActions.selectNode(null));
              if (item.isCustom) dispatch(ProjectActions.setMode("create"));
            }}
          >
            <div className="flex flex-row gap-4 items-baseline justify-between">
              {getDistrictName(item)}
              <div className="flex flex-row gap-1 items-center">
                {getEdits(cache[item.name])}
                {(cache[item.name]?.errors.length ?? 0) > 0 && (
                  <TriangleAlert className="text-red-500" size={16} />
                )}
              </div>
            </div>
          </DropdownItem>
        );

        if (!item.isCustom) return element;

        const districtCache = cache[item.name];
        const disableDelete = districtCache?.nodes.length > 0;

        return (
          <Dropdown
            className="min-w-auto!"
            key={item.name}
            trigger={element}
            direction="left"
            align="center"
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
                  map3d?.reset();
                }
              }}
              data-tooltip="Can not delete district with nodes"
              data-flow="top"
            >
              Delete district
            </DropdownItem>
          </Dropdown>
        );
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
