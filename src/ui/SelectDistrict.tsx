import { ChevronDown, Plus, Trash2 /*TriangleAlert*/ } from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import { ProjectActions, ProjectSelectors } from "../store/project.ts";
import type { NodesIndex } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";
import { clsx } from "../utilities/utilities.ts";

const getEdits = (index: NodesIndex[string]) => {
  if (!index || index.treeNode.type !== "district") return null;
  const treeNode = index.treeNode;
  const additions = treeNode.create.reduce((acc, node) => acc + node.weight, 0);
  const updates = treeNode.update.reduce((acc, node) => acc + node.weight, 0);
  const deletions = treeNode.delete.reduce((acc, node) => acc + node.weight, 0);

  return (
    <div className="flex flex-row gap-0.5 text-sm &:empty:hidden">
      {additions > 0 && <div className="text-green-400">+{additions}</div>}
      {updates > 0 && <div className="text-yellow-400">~{updates}</div>}
      {deletions > 0 && <div className="text-red-400">-{deletions}</div>}
    </div>
  );
};

function SelectDistrict() {
  const map3d = useMap3D();
  const dispatch = useAppDispatch();
  const project = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const index = useAppSelector(NodesSelectors.getNodesIndex);

  return (
    <Dropdown
      trigger={
        <Button
          className={clsx(
            "w-64 justify-between!",
            project && !district && "border border-amber-500!",
            (!project || district) && "border-none",
          )}
        >
          <div className="w-full truncate text-left">
            {district
              ? `Selected: ${getDistrictName(district)}`
              : "Select district"}
          </div>
          <div className="flex flex-row gap-1 items-center">
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
                {getEdits(index[item.name])}
              </div>
            </div>
          </DropdownItem>
        );

        if (!item.isCustom) return element;

        const districtIndex = index[item.name];
        const disableDelete = districtIndex?.descendantIds.length > 0;

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
