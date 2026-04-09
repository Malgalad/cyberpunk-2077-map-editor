import * as React from "react";

import { clsx, toString } from "../../utilities/utilities.ts";

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
const decimalSeparator = new Intl.NumberFormat(navigator.language)
  .formatToParts(1.5)
  .find((part) => part.type === "decimal")!.value;

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
  const [sliding, setSliding] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [startValue, setStartValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timerRef = React.useRef<number | null>(null);
  const valueRef = React.useRef(value);
  const valueRef2 = React.useRef(value);
  const tRef = React.useRef(0);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      onChange?.(event);
    },
    [onChange],
  );

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
      onMouseDown?.(event);
      if (props.disabled || props.readOnly) return;
      setIsDragging(true);
      setSliding(event.getModifierState("Control"));
      setStartY(event.clientY);
      setStartValue(value);
    },
    [value, props.disabled, props.readOnly, onMouseDown],
  );

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;

      event.preventDefault();
      const deltaY = startY - event.clientY;
      if (sliding) {
        if (timerRef.current !== null) clearInterval(timerRef.current);
        tRef.current = performance.now();
        valueRef.current = valueRef2.current;
        timerRef.current = window.setInterval(() => {
          const dt = performance.now() - tRef.current;
          const value = Math.min(
            parseFloat(`${max}`),
            Math.max(
              parseFloat(`${min}`),
              parseFloat(valueRef.current) +
                (deltaY / 250) * dt * parseFloat(`${step}`),
            ),
          );
          const eventLike = {
            target: { value: toPrecision(value) },
          } as React.ChangeEvent<HTMLInputElement>;
          valueRef2.current = eventLike.target.value;
          handleChange(eventLike);
        }, 50);
      } else {
        const value = Math.min(
          parseFloat(`${max}`),
          Math.max(
            parseFloat(`${min}`),
            parseFloat(startValue) + deltaY * parseFloat(`${step}`),
          ),
        );
        const eventLike = {
          target: { value: toPrecision(value) },
        } as React.ChangeEvent<HTMLInputElement>;
        handleChange(eventLike);
      }
    },
    [isDragging, max, min, handleChange, startValue, startY, step, sliding],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    setSliding(false);
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
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

  React.useEffect(() => {
    const trimmed = value.trim();
    const notValidNumber =
      trimmed === "" ||
      trimmed === "-" ||
      trimmed.endsWith(decimalSeparator) ||
      trimmed.endsWith("0");
    // if value is not a valid number, props.value will be 0
    // BUT if we're editing this field, don't use it and wait for a valid value
    if (notValidNumber && document.activeElement === inputRef.current) return;
    if (typeof props.value === "number" && toString(props.value) !== trimmed) {
      setValue(toString(props.value));
    }
  }, [props.value, value]);

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
