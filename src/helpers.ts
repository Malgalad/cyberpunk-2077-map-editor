import {
  decodeImageData,
  exportDDS,
  type InstanceTransforms,
} from "./map3d/importDDS.ts";
import { ModalsActions } from "./store/modals.ts";
import { NodesActions } from "./store/nodes.ts";
import type { AppDispatch, DistrictData, MapNode } from "./types.ts";

export function importData(dispatch: AppDispatch, district?: string) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file || !district) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== "string") return;

      try {
        const data = JSON.parse(content);

        if (!data[district]) {
          throw new Error("File does not contain data for this district");
        }

        if (
          !(
            Array.isArray(data[district].nodes) &&
            Array.isArray(data[district].removals)
          )
        ) {
          throw new Error(
            "Invalid data format. Expected arrays of nodes and removals",
          );
        }

        dispatch(NodesActions.setNodes(data[district].nodes));
        dispatch(NodesActions.setRemovals(data[district].removals));
      } catch (error: unknown) {
        dispatch(
          ModalsActions.openModal(
            "alert",
            error instanceof SyntaxError
              ? "Failed to parse JSON file"
              : error instanceof Error
                ? error.message
                : "Unknown error",
          ),
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function exportData(
  nodes: MapNode[],
  removals: number[],
  district?: string,
) {
  if (!district) return;

  const blob = new Blob([JSON.stringify({ [district]: { nodes, removals } })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.download = `${district}.json`;
  anchorElement.click();
  URL.revokeObjectURL(url);
}

export async function exportToDDS(
  additions: InstanceTransforms[],
  removals: number[],
  districtData?: DistrictData,
) {
  if (!districtData) return;
  const instances = decodeImageData(new Uint16Array(districtData.imageData));
  const blob = exportDDS(instances, additions, removals);
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.download = `${districtData.name}.dds`;
  anchorElement.click();
  URL.revokeObjectURL(url);
}
