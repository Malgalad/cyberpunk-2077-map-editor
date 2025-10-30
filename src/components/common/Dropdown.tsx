import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

type DropdownProps = {
  align?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  direction?: "bottom" | "top" | "left" | "right";
  disabled?: boolean;
  level?: number;
  trigger: React.ReactElement<HTMLButtonElement>;
};

function Dropdown({
  align = "left",
  children,
  className,
  containerClassName,
  direction = "bottom",
  disabled = false,
  level = 0,
  trigger,
}: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const positionClass = {
    "bottom left": "top-full left-0",
    "bottom right": "top-full right-0",
    "top left": "bottom-full left-0",
    "top right": "bottom-full right-0",
    "left top": "top-0 right-full",
    "left bottom": "bottom-0 right-full",
    "right top": "top-0 left-full",
    "right bottom": "bottom-0 left-full",
  }[direction + " " + align];

  return (
    <div
      className={clsx(`relative group/level-${level}`, containerClassName)}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {React.cloneElement(trigger, { disabled })}
      {isOpen && !disabled && (
        <div
          className={clsx(
            "absolute z-10 w-max min-w-60 p-1.5 rounded-md",
            "flex flex-col",
            " bg-slate-800 border border-slate-900 shadow-lg",
            positionClass,
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
