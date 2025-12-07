import { Square, SquareCheckBig, SquareMinus, SquarePlus } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import { useAppSelector } from "../hooks.ts";
import { DistrictSelectors } from "../store/district.ts";
import { NodesSelectors } from "../store/nodes.ts";
import type { ModalProps } from "../types/modals.ts";
import type { District } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";
import { clsx } from "../utilities/utilities.ts";

export type Tabs = "import" | "export";
const tabs: { key: Tabs; label: string }[] = [
  { key: "import", label: "Import" },
  { key: "export", label: "Export" },
];

function ImportExportNodesModal(props: ModalProps) {
  const { data: defaultTab = "export" } = props as { data?: Tabs };
  const [tab, setTab] = React.useState<Tabs>(defaultTab);
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const [expanded, setExpanded] = React.useState(new Set<string>([]));
  const [selected, setSelected] = React.useState(new Set<string>([]));

  const toggleCollapseExpand =
    (district: District) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setExpanded((expanded) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(district.name)) newExpanded.delete(district.name);
        else newExpanded.add(district.name);
        return newExpanded;
      });
    };
  const toggleSelected =
    (ids: string[]) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setSelected((selected) => {
        const newSelected = new Set(selected);
        for (const id of ids) {
          if (newSelected.has(id)) newSelected.delete(id);
          else newSelected.add(id);
        }
        return newSelected;
      });
    };
  const importExport = async () => {
    props.onClose();
  };

  const selectedNodesCount = [...selected.values()]
    .map((parentId) => cache[parentId]?.additions.length || 1)
    .reduce((a, b) => a + b, 0);

  const title = {
    import: "Import nodes",
    export: "Export nodes",
  }[tab];
  const footer = (
    <>
      {tab === "export" && (
        <div className="mr-2 mt-1.5">{selectedNodesCount} nodes selected</div>
      )}
      <Button className="w-24" onClick={importExport}>
        {tab === "import" ? "Import" : "Export"}
      </Button>
    </>
  );

  function renderImportNodes() {
    return null;
  }

  function renderExportNodes() {
    return (
      <div className="flex flex-col gap-1 overflow-auto max-h-full">
        {districts
          .filter(
            (district) =>
              !!cache[district.name] &&
              cache[district.name].additions.length > 0,
          )
          .map((district) => (
            <div key={district.name} className="flex flex-col gap-0.5">
              <div
                className="flex flex-row gap-2 items-center cursor-pointer select-none"
                onClick={toggleSelected(cache[district.name].nodes)}
              >
                <Button
                  className="p-0! min-w-6! w-6 h-6 border-0!"
                  onClick={toggleCollapseExpand(district)}
                >
                  {expanded.has(district.name) ? (
                    <SquareMinus />
                  ) : (
                    <SquarePlus />
                  )}
                </Button>
                <Button className="p-0! min-w-6! w-6 h-6 border-0!">
                  {cache[district.name].nodes.every((node) =>
                    selected.has(node),
                  ) ? (
                    <SquareCheckBig />
                  ) : cache[district.name].nodes.some((node) =>
                      selected.has(node),
                    ) ? (
                    <SquareMinus />
                  ) : (
                    <Square />
                  )}
                </Button>
                {getDistrictName(district)}
              </div>

              {expanded.has(district.name) && (
                <div className="flex flex-col gap-0.5 ml-4">
                  {nodes
                    .filter(
                      (node) =>
                        node.parent === district.name && node.tag === "create",
                    )
                    .map((node) => (
                      <div
                        key={node.id}
                        className="flex flex-row gap-2 items-center cursor-pointer select-none"
                        onClick={toggleSelected(
                          node.type === "group"
                            ? [node.id, ...cache[node.id].nodes]
                            : [node.id],
                        )}
                      >
                        <Button className="p-0! min-w-6! w-6 h-6 border-0!">
                          {selected.has(node.id) ? (
                            <SquareCheckBig />
                          ) : (
                            <Square />
                          )}
                        </Button>
                        <div>{node.label}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
      </div>
    );
  }

  return (
    <Modal className="w-auto!" title={title} footer={footer}>
      <div className="flex flex-row">
        <div className="flex flex-col pt-4 gap-0.5 -mr-[0.667px]">
          {tabs.map((button) => (
            <Button
              key={button.key}
              className={clsx(
                "w-20 z-10",
                button.key === tab && "border-r-slate-900",
                button.key !== tab && "border-transparent",
              )}
              onClick={() => setTab(button.key)}
            >
              {button.label}
            </Button>
          ))}
        </div>
        <div className="border border-slate-500 w-[475px] h-72 p-4">
          {tab === "import" && renderImportNodes()}
          {tab === "export" && renderExportNodes()}
        </div>
      </div>
    </Modal>
  );
}

export default ImportExportNodesModal;
