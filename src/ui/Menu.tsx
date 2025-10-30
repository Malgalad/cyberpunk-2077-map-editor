import {
  HardDriveDownload,
  HardDriveUpload,
  ImageDown,
  Redo,
  Settings,
  Settings2,
  Undo,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { DISTRICTS } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import {
  useExportDDS,
  useExportNodes,
  useImportNodes,
  // useImportDDS,
  useSaveProject,
} from "../hooks/importExport.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { OptionsActions, OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import SelectDistrict from "./SelectDistrict.tsx";

function Menu() {
  const dispatch = useAppDispatch();
  const projectName = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const patternView = useAppSelector(OptionsSelectors.getPatternView);
  const districtView = useAppSelector(OptionsSelectors.getDistrictView);
  const visibleDistricts = useAppSelector(OptionsSelectors.getVisibleDistricts);
  const exportDDS = useExportDDS();
  // const importDDS = useImportDDS();
  const importJSON = useImportNodes();
  const exportJSON = useExportNodes();
  const saveProject = useSaveProject();

  return (
    <div className="flex flex-row justify-between px-2">
      <div className="flex flex-row items-center gap-2">
        {!!projectName && (
          <div className="font-semibold cursor-default max-w-64 truncate">
            Project <span className="text-amber-200">{projectName}</span>
          </div>
        )}
        <div className="border-r border-slate-600 w-[1px]" />
        <Dropdown
          trigger={
            <Button className="border-none cursor-default! group-hover/level-0:bg-slate-600">
              File
            </Button>
          }
        >
          <DropdownItem
            onClick={() => dispatch(ModalsActions.openModal("project", "new"))}
          >
            New project
          </DropdownItem>
          <DropdownItem
            onClick={() => dispatch(ModalsActions.openModal("project", "open"))}
          >
            Open project
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<HardDriveUpload />}
            onClick={() => dispatch(ModalsActions.openModal("project", "load"))}
          >
            Load from file
          </DropdownItem>
          <DropdownItem
            icon={<HardDriveDownload />}
            onClick={saveProject}
            disabled={!projectName || !district}
          >
            Save to file
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            onClick={importJSON}
            disabled={!projectName || !district}
          >
            Import nodes from JSON
          </DropdownItem>
          <DropdownItem
            onClick={exportJSON}
            disabled={!projectName || !district}
          >
            Export nodes to JSON
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<ImageDown />}
            onClick={exportDDS}
            disabled={!projectName || !district}
          >
            Export to DDS
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Settings />} disabled>
            Project settings
          </DropdownItem>
        </Dropdown>

        <Dropdown
          trigger={
            <Button className="border-none cursor-default! group-hover/level-0:bg-slate-600">
              Edit
            </Button>
          }
        >
          <DropdownItem icon={<Undo />} disabled>
            Undo
          </DropdownItem>
          <DropdownItem icon={<Redo />} disabled>
            Redo
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem disabled icon={<Settings2 />}>
            District properties
          </DropdownItem>
        </Dropdown>

        <Dropdown
          trigger={
            <Button className="border-none cursor-default! group-hover/level-0:bg-slate-600">
              View
            </Button>
          }
        >
          <Dropdown
            trigger={
              <DropdownItem
                className="not-disabled:group-hover/level-1:bg-slate-600"
                isExpandable
              >
                Show districts
              </DropdownItem>
            }
            level={1}
            direction="right"
            align="top"
            disabled={!projectName || !district}
          >
            <DropdownItem
              checked={districtView === "all"}
              onClick={() => dispatch(OptionsActions.setDistrictView("all"))}
            >
              All
            </DropdownItem>
            <DropdownItem
              checked={districtView === "current"}
              onClick={() =>
                dispatch(OptionsActions.setDistrictView("current"))
              }
            >
              Current
            </DropdownItem>
            <DropdownItem
              checked={districtView === "custom"}
              onClick={() => dispatch(OptionsActions.setDistrictView("custom"))}
            >
              Custom selection
            </DropdownItem>
            <DropdownSeparator />
            {DISTRICTS.map((item) => (
              <DropdownItem
                key={item.key}
                checked={
                  visibleDistricts.includes(item.key) ||
                  item.key === district?.name
                }
                disabled={
                  item.key === district?.name || districtView !== "custom"
                }
                onClick={() =>
                  dispatch(OptionsActions.toggleDistrictVisibility(item.key))
                }
              >
                {item.label}
              </DropdownItem>
            ))}
          </Dropdown>

          <Dropdown
            trigger={
              <DropdownItem
                className="group-hover/level-1:bg-slate-600"
                isExpandable
              >
                Render patterns
              </DropdownItem>
            }
            level={1}
            direction="right"
            align="top"
            disabled={!projectName || !district}
          >
            <DropdownItem
              checked={patternView === "none"}
              onClick={() => dispatch(OptionsActions.setPatternView("none"))}
            >
              Hidden
            </DropdownItem>
            <DropdownItem
              checked={patternView === "wireframe"}
              onClick={() =>
                dispatch(OptionsActions.setPatternView("wireframe"))
              }
            >
              Wireframe
            </DropdownItem>
            <DropdownItem
              checked={patternView === "solid"}
              onClick={() => dispatch(OptionsActions.setPatternView("solid"))}
            >
              Solid
            </DropdownItem>
          </Dropdown>

          <DropdownSeparator />
          <DropdownItem
            onClick={() => dispatch(ModalsActions.openModal("district-info"))}
            disabled={!district}
          >
            Selected district properties
          </DropdownItem>
        </Dropdown>

        {/*
        <Button
          className="border-none tooltip"
          onClick={() => importDDS()}
          data-tooltip="Import DDS texture to this district"
          data-flow="bottom"
        >
          Import
        </Button>
        */}
      </div>

      <SelectDistrict />
    </div>
  );
}

export default Menu;
