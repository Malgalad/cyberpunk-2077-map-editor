import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

interface DraggableInputProps {
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

export default function DraggableInput({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  className = "",
}: DraggableInputProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [startValue, setStartValue] = React.useState("0");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setStartY(e.clientY);
      setStartValue(value);
      document.body.style.cursor = "ns-resize";
    },
    [value],
  );

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startY - e.clientY;
      const newValue = Math.min(
        max,
        Math.max(min, parseFloat(startValue) + deltaY * step),
      );
      onChange(newValue.toString());
    },
    [isDragging, max, min, onChange, startValue, startY, step],
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
    <input
      ref={inputRef}
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={handleMouseDown}
      className={clsx(
        "cursor-ns-resize border border-slate-600 p-1.5",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className,
      )}
    />
  );
}
