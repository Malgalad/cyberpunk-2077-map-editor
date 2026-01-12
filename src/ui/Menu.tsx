import {
  FileDown,
  FilePlus2,
  FileUp,
  FolderOpen,
  HardDriveDownload,
  HardDriveUpload,
  ImageDown,
  PackageCheck,
  Redo,
  Settings2,
  Undo,
} from "lucide-react";
import { ActionCreators } from "redux-undo";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import DropdownSeparator from "../components/common/Dropdown/Dropdown.Separator.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import { KNOWN_MESHES } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import {
  useExportDDS,
  useImportDDS,
  useSaveProject,
} from "../hooks/importExport.ts";
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
  const visibleMeshes = useAppSelector(OptionsSelectors.getVisibleMeshes);
  const exportDDS = useExportDDS();
  const importDDS = useImportDDS();
  const saveProject = useSaveProject();
  const hasPast = useAppSelector((state) => state.past.length > 0);
  const hasFuture = useAppSelector((state) => state.future.length > 0);

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
          <Tooltip tooltip="Ctrl+Shift+S" flow="right">
            <DropdownItem
              icon={<HardDriveDownload />}
              onClick={saveProject}
              disabled={!projectName}
            >
              <span>Save to disk</span>
            </DropdownItem>
          </Tooltip>
          <DropdownSeparator />
          <Dropdown
            direction="right"
            align="top"
            trigger={<DropdownItem>Import/Export</DropdownItem>}
            disabled
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
            <DropdownSeparator />
            <DropdownItem
              onClick={() => void importDDS()}
              disabled={!(projectName && district)}
              icon={<PackageCheck />}
            >
              Verify DDS with current district
            </DropdownItem>
          </Dropdown>
        </Dropdown>

        <Dropdown
          trigger={
            <Button className="border-none cursor-default!">Edit</Button>
          }
        >
          <Tooltip tooltip="Ctrl+Z" flow="right">
            <DropdownItem
              icon={<Undo />}
              onClick={() => dispatch(ActionCreators.undo())}
              disabled={!hasPast}
            >
              Undo
            </DropdownItem>
          </Tooltip>
          <Tooltip tooltip="Ctrl+Shift+Z" flow="right">
            <DropdownItem
              icon={<Redo />}
              onClick={() => dispatch(ActionCreators.redo())}
              disabled={!hasFuture}
            >
              Redo
            </DropdownItem>
          </Tooltip>
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

          <Dropdown
            trigger={<DropdownItem>Meshes</DropdownItem>}
            direction="right"
            align="top"
            disabled={!projectName}
          >
            {KNOWN_MESHES.map((id) => (
              <DropdownItem
                key={id}
                checked={visibleMeshes.includes(id)}
                onClick={() =>
                  dispatch(OptionsActions.toggleMeshVisibility(id))
                }
              >
                {id}
              </DropdownItem>
            ))}
          </Dropdown>
        </Dropdown>

        <div className="border-r border-slate-500 h-full" />

        <Button
          className="border-none tooltip"
          onClick={exportDDS}
          disabled={
            !projectName || !district /*||
            !cache?.instances.length ||
            (cache?.errors.length ?? 0) > 0*/
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
