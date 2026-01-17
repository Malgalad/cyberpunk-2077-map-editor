import * as React from "react";

import { useAppSelector } from "../../hooks/hooks.ts";
import { NodesSelectors } from "../../store/nodesV2.ts";
import type { District, DistrictProperties } from "../../types/types.ts";
import {
  calculateHeight,
  getFinalDistrictTransformsFromNodes,
} from "../../utilities/district.ts";
import { mapSize } from "./editDistrictModal.constants.ts";

export function useDrawOnCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  [data, setData]: [
    DistrictProperties,
    React.Dispatch<React.SetStateAction<DistrictProperties>>,
  ],
  disabled: boolean,
) {
  const renderRef = React.useRef<
    ((current: DistrictProperties) => void) | null
  >(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 512 * window.devicePixelRatio;
    canvas.height = 512 * window.devicePixelRatio;

    const mapToCanvas = (x: number, y: number) => {
      const xCanvas = ((x + mapSize / 2) / mapSize) * canvas.width;
      const yCanvas = ((y + mapSize / 2) / mapSize) * canvas.height;
      return { x: xCanvas, y: yCanvas };
    };
    const canvasToMap = (x: number, y: number) => {
      const xMap = (x / canvas.width) * mapSize - mapSize / 2;
      const yMap = (y / canvas.height) * mapSize - mapSize / 2;
      return [xMap, yMap];
    };

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    let isDrawing = false;
    let start = mapToCanvas(
      data.position[0] + data.transMin[0],
      -data.position[1] - data.transMin[1],
    );
    let end = mapToCanvas(
      data.position[0] + data.transMax[0],
      -data.position[1] - data.transMax[1],
    );

    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}full_map.png`;
    image.onload = () => {
      render();
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      start = { x, y };
      end = { x, y };
      isDrawing = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      end = { x, y };
      const bottomLeft = canvasToMap(
        Math.min(start.x, end.x),
        Math.max(start.y, end.y),
      );
      const topRight = canvasToMap(
        Math.max(start.x, end.x),
        Math.min(start.y, end.y),
      );
      const center = [
        (bottomLeft[0] + topRight[0]) / 2,
        (bottomLeft[1] + topRight[1]) / 2,
      ];
      const transMax = [center[0] - bottomLeft[0], center[1] - bottomLeft[1]];
      const transMin = [center[0] - topRight[0], center[1] - topRight[1]];

      setData((properties) => ({
        ...properties,
        position: [
          Math.round(center[0]),
          Math.round(-center[1]),
          properties.position[2],
        ],
        transMin: [
          Math.round(transMin[0]),
          Math.round(-transMin[1]),
          properties.transMin[2],
          properties.transMin[3],
        ],
        transMax: [
          Math.round(transMax[0]),
          Math.round(-transMax[1]),
          properties.transMax[2],
          properties.transMax[3],
        ],
      }));
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    function render(current = data) {
      if (!canvas || !ctx) return;

      const start = mapToCanvas(
        current.position[0] + current.transMin[0],
        -current.position[1] - current.transMin[1],
      );
      const end = mapToCanvas(
        current.position[0] + current.transMax[0],
        -current.position[1] - current.transMax[1],
      );

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (start && end) {
        ctx.strokeStyle = "#ff8800";
        ctx.fillStyle = "#ff880033";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(
          Math.min(start.x, end.x),
          Math.min(start.y, end.y),
          Math.abs(end.x - start.x),
          Math.abs(end.y - start.y),
        );
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
      }
    }
    renderRef.current = render;

    if (disabled) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return renderRef;
}

export function useDistrictTextureHeight(district?: District) {
  const nodes = useAppSelector(NodesSelectors.getNodes);
  const tree = useAppSelector(NodesSelectors.getNodesTree);

  return React.useMemo(() => {
    if (!district) return 0;

    const transforms = getFinalDistrictTransformsFromNodes(
      district,
      nodes,
      tree,
    );

    return calculateHeight(transforms.length);
  }, [district, nodes, tree]);
}
