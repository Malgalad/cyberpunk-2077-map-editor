import { AlertTriangle, Square, SquareCheckBig } from "lucide-react";
import * as React from "react";
import * as z from "zod";

import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import Select from "../components/common/Select.tsx";
import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { DistrictActions, DistrictSelectors } from "../store/district.ts";
import { NodesActions, NodesSelectors } from "../store/nodesV2.ts";
import type { ModalProps } from "../types/modals.ts";
import { NodeSchemaV2 } from "../types/schemas.ts";
import type { MapNodeV2 } from "../types/types.ts";
import { getDistrictName } from "../utilities/district.ts";
import {
  downloadBlob,
  uploadFileByExtensions,
} from "../utilities/fileHelpers.ts";
import {
  buildSupportStructures,
  cloneNode,
  transplantNode,
} from "../utilities/nodes.ts";
import { clsx } from "../utilities/utilities.ts";

export type Tabs = "import" | "export";
type Loaded = {
  filename: string | null;
  nodes: MapNodeV2[] | null;
  error: z.ZodError | Error | null;
};
const tabs: { key: Tabs; label: string }[] = [
  { key: "import", label: "Import" },
  { key: "export", label: "Export" },
];
const NodesSchema = z.array(NodeSchemaV2);

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
  const index = useAppSelector(NodesSelectors.getNodesIndex);
  const selected = useAppSelector(NodesSelectors.getSelectedNodes);
  const unIndex = React.useMemo(
    () =>
      tab === "import"
        ? loaded.nodes &&
          buildSupportStructures(
            Object.fromEntries(loaded.nodes.map((node) => [node.id, node])),
          ).index
        : index,
    [tab, loaded, index],
  );
  const [checked, setChecked] = React.useState(new Set<string>());
  const [district, setDistrict] = React.useState<string>("");

  React.useEffect(() => {
    setLoaded({
      filename: null,
      nodes: null,
      error: null,
    });
    setChecked(new Set<string>(tab === "export" ? selected : []));
    setDistrict("");
  }, [tab, selected]);

  const toggleSelected =
    (id: string) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setChecked((selected) => {
        const newSelected = new Set(selected);

        if (selected.has(id)) newSelected.delete(id);
        else newSelected.add(id);

        return newSelected;
      });
    };
  const loadNodesJSON = async (): Promise<Loaded> => {
    const file = await uploadFileByExtensions(".json");
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
      const selectedNodes = checked
        .values()
        .map((id) => transplantNode(nodes, nodes[id], null, nodes[id].district))
        .flatMap((node) => cloneNode(nodes, index, node))
        .toArray();
      const json = JSON.stringify(selectedNodes, null, 2);
      const blob = new Blob([json], { type: "application/json" });

      downloadBlob(blob, `nodes_${Date.now()}.json`);
    }
    if (tab === "import") {
      if (!loaded.nodes || !district || !unIndex) return;

      const loadedNodes = Object.fromEntries(
        loaded.nodes.map((node) => [node.id, node]),
      );
      const selectedDistrict = districts.find((dist) => dist.name === district);

      if (!selectedDistrict) return;

      const toImport = Object.fromEntries(
        loaded.nodes
          .filter((node) => checked.has(node.id))
          .flatMap((node) => {
            if (node.type === "instance") return [node];
            return [
              node,
              ...unIndex[node.id].descendantIds.map((id) => loadedNodes[id]),
            ];
          })
          .map((node) => ({ ...node, district }))
          .map((node) => [node.id, node]),
      );

      dispatch(NodesActions.batchAddNodes(toImport));
      dispatch(DistrictActions.selectDistrict(district));
    }
    props.onClose();
  };

  const title = {
    import: "Import nodes",
    export: "Export nodes",
  }[tab];
  const footer = (
    <Button
      className="w-24"
      onClick={importExport}
      disabled={
        tab === "import"
          ? !(loaded.nodes && checked.size > 0 && district !== "")
          : checked.size === 0
      }
    >
      {tab === "import" ? "Import" : "Export"}
    </Button>
  );

  function renderNode(node: MapNodeV2) {
    if (!unIndex) return null;

    const parentTree = unIndex[node.parent || node.district].treeNode;
    const weight = (
      parentTree?.type === "district"
        ? parentTree[node.tag]
        : parentTree.children
    ).find((n) => n.id === node.id)?.weight;

    return (
      <div key={node.id} className="flex flex-col gap-1">
        <div
          onClick={toggleSelected(node.id)}
          className="flex flex-row gap-2 items-center cursor-pointer select-none"
        >
          {checked.has(node.id) ? <SquareCheckBig /> : <Square />}
          {node.label}
          <span className="text-gray-400">({weight})</span>
        </div>
      </div>
    );
  }

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
                .filter((node) => node.parent === null)
                .map((node) => renderNode(node))}
            </div>
          </>
        )}
      </div>
    );
  }

  function renderExportNodes() {
    return (
      <div className="flex flex-col gap-1 overflow-auto max-h-full">
        {selected.length === 0 && (
          <div className="w-full text-center italic">
            Select nodes you want to export
          </div>
        )}
        {selected.length > 0 && selected.map((id) => renderNode(nodes[id]))}
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
        <div className="border border-slate-500 w-[475px] h-96 p-4">
          {tab === "import" && renderImportNodes()}
          {tab === "export" && renderExportNodes()}
        </div>
      </div>
    </Modal>
  );
}

export default ImportExportNodesModal;
