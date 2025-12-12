import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

export default function DraggableInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { onChange, onMouseDown } = props;
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [startValue, setStartValue] = React.useState("0");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
      onMouseDown?.(e);
      if (props.disabled || props.readOnly) return;
      setIsDragging(true);
      setStartY(e.clientY);
      setStartValue(`${props.value}`);
      document.body.style.cursor = "ns-resize";
    },
    [props.value, props.disabled, props.readOnly, onMouseDown],
  );

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const { max = Infinity, min = -Infinity, step = 1 } = props;
      const deltaY = startY - e.clientY;
      const newValue = Math.min(
        parseFloat(`${max}`),
        Math.max(
          parseFloat(`${min}`),
          parseFloat(startValue) + deltaY * parseFloat(`${step}`),
        ),
      );
      const precision =
        Math.abs(newValue) > 1000
          ? 8
          : Math.abs(newValue) > 100
            ? 7
            : Math.abs(newValue) > 10
              ? 6
              : 5;
      onChange?.({
        target: { value: newValue.toPrecision(precision) },
      } as React.ChangeEvent<HTMLInputElement>);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isDragging,
      props.max,
      props.min,
      onChange,
      startValue,
      startY,
      props.step,
    ],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "default";
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={clsx("w-min", props["aria-invalid"] && "tooltip")}
      data-tooltip={props["aria-errormessage"] ?? ""}
      data-flow="top"
    >
      <input
        {...props}
        ref={inputRef}
        type="text"
        onMouseDown={handleMouseDown}
        className={clsx(
          "cursor-ns-resize border p-1.5",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:cursor-default read-only:opacity-85",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          !props["aria-invalid"] && "border-slate-600",
          props["aria-invalid"] && "border-red-500",
          props.className,
        )}
      />
    </div>
  );
}
