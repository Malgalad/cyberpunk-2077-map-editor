import {
  Eye,
  HardDriveDownload,
  HardDriveUpload,
  ImageDown,
  Info,
  ListCheck,
} from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Dropdown from "../components/common/Dropdown.tsx";
import { DISTRICTS } from "../constants.ts";
import { loadURLAsArrayBuffer } from "../helpers.ts";
import { useAppDispatch, useAppSelector } from "../hooks.ts";
import {
  useExportDDS,
  // useImportDDS,
  useLoadProject,
  useSaveProject,
} from "../hooks/importExport.ts";
import { STATIC_ASSETS } from "../map3d/constants.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { decodeImageData } from "../map3d/processDDS.ts";
import mapData from "../mapData.min.json";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import type {
  Districts,
  DistrictWithTransforms,
  PatternView,
} from "../types.ts";

function Menu() {
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const [patternView, setPatternView] =
    React.useState<PatternView>("wireframe");
  const [visibleDistricts, setVisibleDistricts] = React.useState<Set<string>>(
    new Set(),
  );
  const [allDistricts, setAllDistricts] = React.useState<
    DistrictWithTransforms[]
  >([]);
  const map3D = useMap3D();
  const dispatch = useAppDispatch();
  const exportDDS = useExportDDS();
  // const importDDS = useImportDDS();
  const loadProject = useLoadProject();
  const saveProject = useSaveProject();

  React.useEffect(() => {
    map3D?.setPatternView(patternView);
  }, [map3D, patternView]);

  React.useEffect(() => {
    const districts: Promise<DistrictWithTransforms>[] = [];

    for (const name of Object.keys(mapData.soup)) {
      const district = mapData.soup[name as keyof Districts];
      districts.push(
        loadURLAsArrayBuffer(
          `${STATIC_ASSETS}/textures/${district.texture.replace(".xbm", ".dds")}`,
        ).then((imageData) => ({
          district: {
            ...district,
            imageData,
            isCustom: false,
            name,
          },
          transforms: decodeImageData(new Uint16Array(imageData)),
        })),
      );
    }

    Promise.all(districts).then(setAllDistricts);
  }, []);

  React.useEffect(() => {
    if (!allDistricts.length || !map3D) return;

    const districtsToRender = Array.from(visibleDistricts).filter(
      (name) => name !== district?.name,
    );
    const group: DistrictWithTransforms[] = [];

    for (const name of districtsToRender) {
      const item = allDistricts.find((item) => item.district.name === name);

      if (!item || item.district.isCustom) continue;

      group.push(item);
    }

    map3D.setVisibleDistricts(group);
  }, [allDistricts, visibleDistricts, district, map3D]);

  return (
    <div className="flex flex-row justify-between px-2">
      <div className="flex flex-row gap-2">
        <Button
          className="border-none"
          onClick={() =>
            dispatch(ModalsActions.openModal("select-district")).then(() => {})
          }
        >
          <ListCheck />
          Select district
        </Button>
        {district && (
          <Button
            className="border-none tooltip"
            onClick={() => dispatch(ModalsActions.openModal("district-info"))}
            data-tooltip="View district properties"
            data-flow="bottom"
          >
            <Info />
          </Button>
        )}
        <div className="border-r border-slate-500" />
        <Button
          className="border-none tooltip"
          onClick={() => loadProject()}
          data-tooltip="Load district data and edited nodes from project file"
          data-flow="bottom"
        >
          <HardDriveUpload />
          Load
        </Button>
        <Button
          className="border-none tooltip"
          onClick={() => saveProject()}
          data-tooltip="Save district data and editied nodes to project file"
          data-flow="bottom"
        >
          <HardDriveDownload />
          Save
        </Button>
        <div className="border-r border-slate-500" />
        <Button
          className="border-none tooltip"
          onClick={() => exportDDS()}
          data-tooltip="Compile edits to DDS texture in game format"
          data-flow="bottom"
        >
          <ImageDown />
          Export
        </Button>
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
      <div className="flex flex-row gap-2">
        <Dropdown
          trigger={<Button className="border-none">Visible Districts</Button>}
        >
          <div className="flex flex-col p-2 gap-2 text-sm">
            {DISTRICTS.map((item) => (
              <label
                key={item.key}
                className="flex flex-row gap-1 items-center"
              >
                <input
                  type="checkbox"
                  checked={
                    visibleDistricts.has(item.key) ||
                    item.key === district?.name
                  }
                  onChange={() => {
                    const next = new Set(visibleDistricts);
                    if (visibleDistricts.has(item.key)) {
                      next.delete(item.key);
                    } else {
                      next.add(item.key);
                    }
                    setVisibleDistricts(next);
                  }}
                  disabled={item.key === district?.name}
                />
                {item.label}
              </label>
            ))}
          </div>
        </Dropdown>
        <Dropdown
          trigger={
            <Button className="border-none">
              <Eye />
              Rendering Options
            </Button>
          }
        >
          <div className="flex flex-col p-2 gap-2 text-sm">
            <div className="font-semibold">Pattern nodes</div>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "none"}
                onChange={() => setPatternView("none")}
              />
              Hidden
            </label>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "wireframe"}
                onChange={() => setPatternView("wireframe")}
              />
              Wireframe
            </label>
            <label className="flex flex-row gap-1 items-center">
              <input
                type="checkbox"
                checked={patternView === "solid"}
                onChange={() => setPatternView("solid")}
              />
              Solid
            </label>
            <div className="border-b border-slate-500" />
          </div>
        </Dropdown>
      </div>
    </div>
  );
}

export default Menu;
