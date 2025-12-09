import {
  FileDown,
  FilePlus2,
  FileUp,
  FolderOpen,
  HardDriveDownload,
  HardDriveUpload,
  ImageDown,
  Redo,
  Settings2,
  Undo,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { useExportDDS, useSaveProject } from "../hooks/importExport.ts";
import { getDistrictCache } from "../store/@selectors.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { OptionsActions, OptionsSelectors } from "../store/options.ts";
import { ProjectSelectors } from "../store/project.ts";
import { getDistrictName } from "../utilities/district.ts";
import SelectDistrict from "./SelectDistrict.tsx";

function Menu() {
  const dispatch = useAppDispatch();
  const projectName = useAppSelector(ProjectSelectors.getProjectName);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const allDistricts = useAppSelector(DistrictSelectors.getAllDistricts);
  const patternView = useAppSelector(OptionsSelectors.getPatternView);
  const districtView = useAppSelector(OptionsSelectors.getDistrictView);
  const visibleDistricts = useAppSelector(OptionsSelectors.getVisibleDistricts);
  const cache = useAppSelector(getDistrictCache);
  const exportDDS = useExportDDS();
  const saveProject = useSaveProject();

  return (
    <div className="flex flex-row justify-between px-2">
      <div className="flex flex-row items-center gap-2">
        {!!projectName && (
          <>
            <div className="font-semibold cursor-default max-w-64 truncate">
              Project <span className="text-amber-200">{projectName}</span>
            </div>
            <div className="border-r border-slate-500 h-full" />
          </>
        )}

        <div className="border-r border-slate-600 w-[1px]" />

        <Dropdown
          trigger={
            <Button className="border-none cursor-default!">File</Button>
          }
        >
          <DropdownItem
            icon={<FilePlus2 />}
            onClick={() => dispatch(ModalsActions.openModal("project", "new"))}
          >
            New project
          </DropdownItem>
          <DropdownItem
            icon={<FolderOpen />}
            onClick={() => dispatch(ModalsActions.openModal("project", "open"))}
          >
            Open project
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<HardDriveUpload />}
            onClick={() => dispatch(ModalsActions.openModal("project", "load"))}
          >
            Load from disk
          </DropdownItem>
          <DropdownItem
            icon={<HardDriveDownload />}
            onClick={saveProject}
            disabled={!projectName}
          >
            Save to disk
          </DropdownItem>
          <DropdownSeparator />
          <Dropdown
            direction="right"
            align="top"
            trigger={<DropdownItem>Import/Export</DropdownItem>}
          >
            <DropdownItem
              onClick={() =>
                dispatch(ModalsActions.openModal("import-export", "import"))
              }
              disabled={!projectName}
              icon={<FileUp />}
            >
              Import nodes to project
            </DropdownItem>
            <DropdownItem
              onClick={() =>
                dispatch(ModalsActions.openModal("import-export", "export"))
              }
              disabled={!projectName}
              icon={<FileDown />}
            >
              Export nodes
            </DropdownItem>
          </Dropdown>
        </Dropdown>

        <Dropdown
          trigger={
            <Button className="border-none cursor-default!">Edit</Button>
          }
        >
          <DropdownItem icon={<Undo />} disabled>
            Undo
          </DropdownItem>
          <DropdownItem icon={<Redo />} disabled>
            Redo
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<Settings2 />}
            disabled={!district}
            onClick={() =>
              void dispatch(ModalsActions.openModal("edit-district", true))
            }
          >
            District properties
          </DropdownItem>
        </Dropdown>

        <Dropdown
          trigger={
            <Button className="border-none cursor-default!">View</Button>
          }
        >
          <Dropdown
            trigger={<DropdownItem>Show districts</DropdownItem>}
            direction="right"
            align="top"
            disabled={!projectName}
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
              disabled={!district}
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
            {allDistricts.map((item) => (
              <DropdownItem
                key={item.name}
                checked={
                  visibleDistricts.includes(item.name) ||
                  item.name === district?.name
                }
                disabled={
                  item.name === district?.name || districtView !== "custom"
                }
                onClick={() =>
                  dispatch(OptionsActions.toggleDistrictVisibility(item.name))
                }
              >
                {getDistrictName(item)}
              </DropdownItem>
            ))}
          </Dropdown>

          <Dropdown
            trigger={<DropdownItem>Render patterns</DropdownItem>}
            direction="right"
            align="top"
            disabled={!projectName}
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
        </Dropdown>

        <div className="border-r border-slate-500 h-full" />

        <Button
          className="border-none tooltip"
          onClick={exportDDS}
          disabled={
            !projectName ||
            !district ||
            !cache?.instances.length ||
            (cache?.errors.length ?? 0) > 0
          }
          data-tooltip="Compile district changes and export to DDS texture"
          data-flow="bottom"
        >
          <div className="flex flex-row gap-2 items-center">
            <ImageDown />
            <span>Compile</span>
          </div>
        </Button>
      </div>

      <SelectDistrict />
    </div>
  );
}

export default Menu;
