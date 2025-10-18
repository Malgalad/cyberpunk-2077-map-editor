import { produce } from "immer";
import { HelpCircle } from "lucide-react";
import * as React from "react";

import Button from "../components/common/Button.tsx";
import DraggableInput from "../components/common/DraggableInput.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import { useAppDispatch } from "../hooks.ts";
import { DistrictActions } from "../store/district.ts";
import { ModalsActions } from "../store/modals.ts";
import { toNumber, toString } from "../utilities.ts";

const mapSize = 16_000;
const axii = [0, 1, 2] as const;

function CustomDistrictModal() {
  const dispatch = useAppDispatch();
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const [data, setData] = React.useState({
    pos: ["0", "0", "0"],
    min: ["-2000", "-2000", "-50"],
    max: ["2000", "2000", "650"],
    cubeSize: "200",
  });
  const [name, setName] = React.useState<string>("my_district");
  const renderRef = React.useRef<(current: typeof data) => void>(undefined);
  // TODO validation of values
  const validationErrors = (() => {
    if (name.length === 0) return "Name cannot be empty";
    if (name.length > 40) return "Name cannot be longer than 40 characters";
    return "";
  })();
  const isValid = !validationErrors;

  React.useEffect(() => {
    const canvas = ref.current;
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
      toNumber(data.pos[0]) + toNumber(data.min[0]),
      -toNumber(data.pos[1]) - toNumber(data.min[1]),
    );
    let end = mapToCanvas(
      toNumber(data.pos[0]) + toNumber(data.max[0]),
      -toNumber(data.pos[1]) - toNumber(data.max[1]),
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

      setData((rect) => ({
        pos: [
          toString(Math.round(center[0])),
          toString(Math.round(-center[1])),
          rect.pos[2],
        ],
        min: [
          toString(Math.round(transMin[0])),
          toString(Math.round(-transMin[1])),
          rect.min[2],
        ],
        max: [
          toString(Math.round(transMax[0])),
          toString(Math.round(-transMax[1])),
          rect.max[2],
        ],
        cubeSize: rect.cubeSize,
      }));
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    function render(current = data) {
      if (!canvas || !ctx) return;

      const start = mapToCanvas(
        toNumber(current.pos[0]) + toNumber(current.min[0]),
        -toNumber(current.pos[1]) - toNumber(current.min[1]),
      );
      const end = mapToCanvas(
        toNumber(current.pos[0]) + toNumber(current.max[0]),
        -toNumber(current.pos[1]) - toNumber(current.max[1]),
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

  React.useEffect(() => {
    renderRef.current?.(data);
  }, [data]);

  const createDistrict = () => {
    dispatch(ModalsActions.closeModal());
    dispatch(
      DistrictActions.addDistrict({
        name,
        isCustom: true,
        position: data.pos.map(toNumber),
        orientation: [0, 0, 0, 1],
        transMin: [...data.min.map(toNumber), 0],
        transMax: [...data.max.map(toNumber), 1],
        cubeSize: toNumber(data.cubeSize),
      }),
    );
    dispatch(DistrictActions.selectDistrict(name));
  };

  const title = (
    <div className="flex flex-row gap-2 items-center">
      Create new district:
      <div
        className="tooltip text-base font-normal"
        data-tooltip="Draw bounding box on the map that will contain all future buildings. Buildings outside of the range would not be able to be encoded in texture."
        data-flow="bottom"
      >
        <HelpCircle />
      </div>
    </div>
  );

  return (
    <Modal className="w-[858px]" title={title}>
      <div className="flex flex-row gap-4">
        <div className="w-[512px] aspect-square shrink-0">
          <canvas
            ref={ref}
            width={512}
            height={512}
            className="w-full h-full"
          />
        </div>

        <div className="flex flex-col gap-2 grow">
          <div className="flex flex-row justify-between items-center">
            <div className="text-lg font-bold">District properties</div>
            <div
              className="tooltip"
              data-tooltip="District has several properties: position, min and max transform, and cube size. Building data is encoded in 16-bit texture RGBA channels, which is then decoded relative to district properties. All buildings in district must be within boundaries defined by min and max transform, offset by position. Cube size defines the default size of building block, but most blocks are around 1/1000 of it. Follow-up values are sane defaults."
              data-flow="left"
            >
              <HelpCircle />
            </div>
          </div>
          <div>Name:</div>
          <div>
            <Input
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>Position:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.pos[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.pos[i] = value;
                    }),
                  );
                }}
              />
            ))}
          </div>
          <div>TransMin:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.min[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.min[i] = value;
                    }),
                  );
                }}
              />
            ))}
          </div>
          <div>TransMax:</div>
          <div className="flex flex-row gap-2">
            {axii.map((i) => (
              <DraggableInput
                key={i}
                className="w-20"
                value={data.max[i]}
                onChange={(value) => {
                  setData(
                    produce((draft) => {
                      draft.max[i] = value;
                    }),
                  );
                }}
              />
            ))}
          </div>
          <div>CubeSize:</div>
          <div>
            <DraggableInput
              className="w-20"
              value={data.cubeSize}
              onChange={(value) => {
                setData(
                  produce((draft) => {
                    draft.cubeSize = value;
                  }),
                );
              }}
            />
          </div>
          <div className="ml-auto mt-auto">
            <Button onClick={() => createDistrict()} disabled={!isValid}>
              Create
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default CustomDistrictModal;
