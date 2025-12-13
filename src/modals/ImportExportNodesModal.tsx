import {
  AlertTriangle,
  Square,
  SquareCheckBig,
  SquareMinus,
  SquarePlus,
} from "lucide-react";
import * as React from "react";
import * as z from "zod";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import Select from "../components/common/Select.tsx";
import { loadFile, saveBlobToFile } from "../helpers.ts";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodes.ts";
import type { ModalProps } from "../types/modals.ts";
import { NodeSchema } from "../types/schemas.ts";
import type { District, MapNode } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";
import {
  cloneNode,
  createGroupNodesCache,
  parseNode,
  validateNode,
} from "../utilities/nodes.ts";
import { clsx } from "../utilities/utilities.ts";

export type Tabs = "import" | "export";
type Loaded = {
  filename: string | null;
  nodes: MapNode[] | null;
  error: z.ZodError | Error | null;
};
const tabs: { key: Tabs; label: string }[] = [
  { key: "import", label: "Import" },
  { key: "export", label: "Export" },
];
const NodesSchema = z.array(NodeSchema);

function ImportExportNodesModal(props: ModalProps) {
  const { data: defaultTab = "export" } = props as { data?: Tabs };
  const dispatch = useAppDispatch();
  const [tab, setTab] = React.useState<Tabs>(defaultTab);
  const [loaded, setLoaded] = React.useState<Loaded>({
    filename: null,
    nodes: null,
    error: null,
  });
  const districts = useAppSelector(DistrictSelectors.getAllDistricts);
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const cache = useAppSelector(NodesSelectors.getChildNodesCache);
  const nodesMap = React.useMemo(
    () =>
      new Map(
        (tab === "import" ? loaded.nodes || [] : nodes).map((node) => [
          node.id,
          node,
        ]),
      ),
    [nodes, tab, loaded],
  );
  const districtNames = React.useMemo(
    () => new Set(districts.map((district) => district.name)),
    [districts],
  );
  const cacheCache = React.useMemo(
    () =>
      new Map(
        Object.entries(
          tab === "import"
            ? createGroupNodesCache(
                loaded.nodes?.map((node) => ({ ...node, hasErrors: false })) ??
                  [],
              )
            : cache,
        ).map(([key, value]) => [
          key,
          value.nodes.filter((id) => nodesMap.get(id)!.tag === "create"),
        ]),
      ),
    [cache, tab, nodesMap, loaded],
  );
  const [expanded, setExpanded] = React.useState(new Set<string>([]));
  const [selected, setSelected] = React.useState(new Set<string>([]));
  const [district, setDistrict] = React.useState<string>("");

  React.useEffect(() => {
    setLoaded({
      filename: null,
      nodes: null,
      error: null,
    });
    setExpanded(new Set<string>([]));
    setSelected(new Set<string>([]));
    setDistrict("");
  }, [tab]);

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
    (id: string) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setSelected((selected) => {
        const newSelected = new Set(selected);
        const isDistrict = districtNames.has(id);
        const isGroup = !isDistrict && nodesMap.get(id)!.type === "group";

        if (isDistrict || isGroup) {
          const children = cacheCache.get(id)?.slice();
          if (!children) return newSelected;
          if (isGroup) children.unshift(id);
          const allSelected = children.every((id) => newSelected.has(id));

          for (const id of children) {
            if (allSelected) newSelected.delete(id);
            else newSelected.add(id);
          }
        } else {
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
        }

        return newSelected;
      });
    };
  const loadNodesJSON = async (): Promise<Loaded> => {
    const file = await loadFile(".json");
    const content = await file.text();
    try {
      const data = JSON.parse(content);
      const nodes = NodesSchema.parse(data);

      return { filename: file.name, nodes, error: null };
    } catch (error) {
      return {
        filename: file.name,
        nodes: null,
        error: error as Error | z.ZodError,
      };
    }
  };
  const importExport = async () => {
    if (tab === "export") {
      const selectedNodes = nodes
        .filter((node) => selected.has(node.id))
        .filter((node) => districtNames.has(node.parent))
        .flatMap((node) => cloneNode(nodes, node, ""))
        .map((node) => ({ ...node, errors: undefined }));
      const json = JSON.stringify(selectedNodes, null, 2);
      const blob = new Blob([json], { type: "application/json" });

      saveBlobToFile(blob, `nodes_${Date.now()}.json`);
    }
    if (tab === "import") {
      if (!loaded.nodes || !district) return;

      const map = new Map(
        loaded.nodes.map((node) => [node.id, parseNode(node)]),
      );
      const selectedDistrict = districts.find((dist) => dist.name === district);

      if (!selectedDistrict) return;

      const imported = loaded.nodes
        .filter((node) => selected.has(node.id))
        .map((node) => {
          if (node.parent === "") {
            return {
              ...node,
              parent: district,
            };
          }
          return node;
        })
        .map((node) => validateNode(node, map, selectedDistrict));

      dispatch(NodesActions.replaceNodes([...nodes, ...imported]));
      dispatch(DistrictActions.selectDistrict(district));
    }
    props.onClose();
  };

  const title = {
    import: "Import nodes",
    export: "Export nodes",
  }[tab];
  const footer = (
    <>
      {(tab === "export" || loaded.nodes) && (
        <div className="mr-2 mt-1.5">{selected.size} nodes selected</div>
      )}
      <Button
        className="w-24"
        onClick={importExport}
        disabled={
          tab === "import"
            ? !(loaded.nodes && selected.size > 0 && district !== "")
            : selected.size === 0
        }
      >
        {tab === "import" ? "Import" : "Export"}
      </Button>
    </>
  );

  function renderImportNodes() {
    return (
      <div className="flex flex-col gap-4 overflow-auto max-h-full">
        <div className="flex flex-row gap-4 items-center">
          <Button
            className="shrink-0"
            onClick={() => loadNodesJSON().then(setLoaded)}
          >
            Select file
          </Button>
          <div className="overflow-hidden overflow-ellipsis">
            {loaded.filename?.replace(".json", "") || ""}
          </div>
        </div>

        {loaded.error && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 font-semibold">
              <AlertTriangle className="text-red-500" />
              Error parsing JSON.
            </div>
            <div>
              <details className="whitespace-pre-wrap">
                <summary>See details</summary>
                {loaded.error.message}
              </details>
            </div>
          </div>
        )}

        {loaded.nodes && (
          <>
            <div className="border-b-slate-500 border-b" />
            <div className="flex flex-row gap-2 items-center">
              Select target district:
              <Select
                items={[
                  {
                    label: "--",
                    value: "",
                  },
                  ...districts.map((district) => ({
                    label: getDistrictName(district),
                    value: district.name,
                  })),
                ]}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                  setDistrict(event.target.value);
                }}
              />
            </div>
            <div className="border-b-slate-500 border-b" />
            <div className="flex flex-col gap-1">
              {loaded.nodes
                .filter((node) => node.parent === "")
                .map((node) => (
                  <div
                    key={node.id}
                    className="flex flex-row gap-2 items-center cursor-pointer select-none"
                    onClick={toggleSelected(node.id)}
                  >
                    <Button className="p-0! min-w-6! w-6 h-6 border-0!">
                      {selected.has(node.id) ? <SquareCheckBig /> : <Square />}
                    </Button>
                    {node.label}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderExportNodes() {
    return (
      <div className="flex flex-col gap-1 overflow-auto max-h-full">
        {districts
          .filter(
            (district) =>
              cacheCache.has(district.name) &&
              cacheCache.get(district.name)!.length > 0,
          )
          .map((district) => (
            <div key={district.name} className="flex flex-col gap-0.5">
              <div
                className="flex flex-row gap-2 items-center cursor-pointer select-none"
                onClick={toggleSelected(district.name)}
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
                  {cacheCache
                    .get(district.name)!
                    .every((node) => selected.has(node)) ? (
                    <SquareCheckBig />
                  ) : cacheCache
                      .get(district.name)!
                      .some((node) => selected.has(node)) ? (
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
                        onClick={toggleSelected(node.id)}
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
