import { ModalsActions } from "./store/modals.ts";
import { NodesActions } from "./store/nodes.ts";
import type { AppDispatch, Districts, MapNode } from "./types.ts";

export function importData(dispatch: AppDispatch, district?: keyof Districts) {
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

        if (!Array.isArray(data[district])) {
          throw new Error("Invalid data format. Expected array of nodes");
        }

        dispatch(NodesActions.setNodes(data[district]));
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

export function exportData(nodes: MapNode[], district?: keyof Districts) {
  if (!district) return;

  const blob = new Blob([JSON.stringify({ [district]: nodes })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = url;
  anchorElement.download = `${district}.json`;
  anchorElement.click();
  URL.revokeObjectURL(url);
}
