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
import { useInvalidateTransformsCache } from "../hooks/nodes.hooks.ts";
import { useMap3D } from "../map3d/map3d.context.ts";
import { DistrictSelectors } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import { getFutureParent, transplantPoint } from "../utilities/nodes.ts";
import { toTuple3 } from "../utilities/utilities.ts";

function AddNodesTemplates() {
  const dispatch = useAppDispatch();
  const map3d = useMap3D();
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const district = useAppSelector(DistrictSelectors.getDistrict);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);
  const invalidate = useInvalidateTransformsCache();
  const templatesTree = tree[TEMPLATE_ID];
  const templates =
    templatesTree && templatesTree.type === "template"
      ? templatesTree.children
      : [];

  if (!district) return null;

  const onInsert = (id: string) => () => {
    const template = nodes[id];
    if (!map3d) return;
    const parent = getFutureParent(nodes[selected[0]]);
    const center = toTuple3(map3d.getCenter());
    const position = transplantPoint(nodes, center, parent);
    const label = template.label.replace(/TEMPLATE <(.+?)>/, "$1");

    if (parent) invalidate([parent]);
    dispatch(
      NodesActions.cloneNode({
        id: template.id,
        updates: {
          parent,
          label,
          position,
        },
        globalUpdates: {
          district: district.name,
        },
      }),
    );
  };

  const onDelete = (id: string) => async () => {
    const template = nodes[id];
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
        id: selected[0],
        updates: {
          label: `TEMPLATE <${nodes[selected[0]].label}>`,
          parent: null,
          position: [0, 0, 0],
        },
        globalUpdates: {
          district: TEMPLATE_ID,
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
                  {nodes[template.id].label}
                </DropdownItem>
              }
              className="min-w-auto!"
              direction="left"
              align="bottom"
              indent={false}
            >
              <DropdownItem
                onClick={onInsert(template.id)}
                icon={<BetweenHorizonalEnd />}
              >
                Insert
              </DropdownItem>
              <DropdownItem onClick={onDelete(template.id)} icon={<Trash2 />}>
                Delete
              </DropdownItem>
            </Dropdown>
          ))}
      </Dropdown>

      {selected.length > 0 && (
        <Tooltip
          tooltip="Create template from node"
          tooltip2="Template created!"
        >
          <Button
            className="border-none"
            onClick={onCreate}
            disabled={selected.length !== 1}
          >
            <ClipboardPlus />
          </Button>
        </Tooltip>
      )}
    </>
  );
}

export default AddNodesTemplates;
