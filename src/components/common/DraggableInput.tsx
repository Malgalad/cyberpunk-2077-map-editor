import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

// keep the number of digits after floating point constant
const toPrecision = (value: number) =>
  value.toPrecision(
    Math.abs(value) > 1000
      ? 8
      : Math.abs(value) > 100
        ? 7
        : Math.abs(value) > 10
          ? 6
          : 5,
  );

export default function DraggableInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const {
    onChange,
    onMouseDown,
    max = Infinity,
    min = -Infinity,
    step = 1,
  } = props;
  const [value, setValue] = React.useState(`${props.value}`);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [startValue, setStartValue] = React.useState("0");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
      onMouseDown?.(event);
      if (props.disabled || props.readOnly) return;
      setIsDragging(true);
      setStartY(event.clientY);
      setStartValue(`${props.value}`);
      document.body.style.cursor = "ns-resize";
    },
    [props.value, props.disabled, props.readOnly, onMouseDown],
  );

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startY - event.clientY;
      const value = Math.min(
        parseFloat(`${max}`),
        Math.max(
          parseFloat(`${min}`),
          parseFloat(startValue) + deltaY * parseFloat(`${step}`),
        ),
      );
      const eventLike = { target: { value: toPrecision(value) } };
      setValue(eventLike.target.value);
      onChange?.(eventLike as React.ChangeEvent<HTMLInputElement>);
    },
    [isDragging, max, min, onChange, startValue, startY, step],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "default";
  }, []);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      onChange?.(event);
    },
    [onChange],
  );

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
        value={value}
        onChange={handleChange}
        ref={inputRef}
        type="number"
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
