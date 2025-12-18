import {
  BetweenHorizonalEnd,
  ChevronLeft,
  ClipboardPlus,
  LayoutTemplate,
  Trash2,
} from "lucide-react";

import Button from "../components/common/Button.tsx";
import DropdownItem from "../components/common/Dropdown/Dropdown.Item.tsx";
import Dropdown from "../components/common/Dropdown/Dropdown.tsx";
import Tooltip from "../components/common/Tooltip.tsx";
import { TEMPLATE_ID } from "../constants.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { MapNode } from "../types/types.ts";
import { toString } from "../utilities/utilities.ts";

function AddNodesTemplates() {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const templates = useAppSelector(NodesSelectors.getTemplateNodes);

  if (!district) return null;

  const onInsert = (template: MapNode) => () => {
    if (!map3d) return;
    const center = map3d.getCenter();
    if (!center) return;
    const parent = selected[0]
      ? selected[0].type === "group"
        ? selected[0].id
        : selected[0].parent
      : district.name;
    const position = (
      selected[0] ? ["0", "0", "0"] : center.map(toString)
    ) as MapNode["position"];
    const label = template.label.replace(/TEMPLATE <(.+?)>/, "$1");

    dispatch(
      NodesActions.cloneNode({
        id: template.id,
        updates: {
          parent,
          label,
          position,
        },
      }),
    );
  };

  const onDelete = (template: MapNode) => async () => {
    const confirmed = await dispatch(
      ModalsActions.openModal(
        "confirm",
        `Do you want to delete "${template.label}"?`,
      ),
    );

    if (confirmed) {
      dispatch(NodesActions.deleteNodesDeep([template.id]));
    }
  };

  const onCreate = () => {
    if (selected.length !== 1) return;
    dispatch(
      NodesActions.cloneNode({
        id: selected[0].id,
        updates: {
          label: `TEMPLATE <${selected[0].label}>`,
          parent: TEMPLATE_ID,
          position: ["0", "0", "0"],
          errors: undefined,
        },
        selectAfterClone: false,
      }),
    );
  };

  return (
    <>
      <Dropdown
        containerClassName="mr-auto"
        trigger={
          <Button className="border-none cursor-default!">
            <LayoutTemplate />
          </Button>
        }
        direction="left"
        align="bottom"
      >
        {templates.length === 0 && (
          <DropdownItem disabled>No templates</DropdownItem>
        )}

        {templates.length > 0 &&
          templates.map((template) => (
            <Dropdown
              key={template.id}
              trigger={
                <DropdownItem icon={<ChevronLeft />}>
                  {template.label}
                </DropdownItem>
              }
              className="min-w-auto!"
              direction="left"
              align="bottom"
              indent={false}
            >
              <DropdownItem
                onClick={onInsert(template)}
                icon={<BetweenHorizonalEnd />}
              >
                Insert
              </DropdownItem>
              <DropdownItem onClick={onDelete(template)} icon={<Trash2 />}>
                Delete
              </DropdownItem>
            </Dropdown>
          ))}
      </Dropdown>

      {selected.length === 1 && (
        <Tooltip
          tooltip="Create template from node"
          tooltip2="Template created!"
        >
          <Button className="border-none" onClick={onCreate}>
            <ClipboardPlus />
          </Button>
        </Tooltip>
      )}
    </>
  );
}

export default AddNodesTemplates;
