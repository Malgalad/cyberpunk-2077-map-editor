import * as React from "react";

import { useGlobalShortcuts } from "../../hooks.ts";
import { clsx } from "../../utilities/utilities.ts";
import {
  DropdownContextProvider,
  useDropdownContext,
} from "./dropdown.context.ts";

type DropdownProps = {
  align?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  direction?: "bottom" | "top" | "left" | "right";
  disabled?: boolean;
  indent?: boolean;
  trigger: React.ReactElement<HTMLButtonElement>;
  shortcut?: string | ((event: KeyboardEvent) => boolean);
};

function Dropdown({
  align = "left",
  children,
  className,
  containerClassName,
  direction = "bottom",
  disabled = false,
  indent = true,
  trigger,
  shortcut,
}: DropdownProps) {
  const { level } = useDropdownContext();
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

  useGlobalShortcuts(shortcut, () => setIsOpen(!isOpen), disabled);

  return (
    <DropdownContextProvider value={{ level: level + 1, indent }}>
      <div
        className={clsx(`relative group/level-${level}`, containerClassName)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {React.cloneElement(trigger, {
          disabled,
          className: clsx(
            trigger.props.className,
            `group-hover/level-${level}:bg-slate-600`,
          ),
        })}
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
    </DropdownContextProvider>
  );
}

export default Dropdown;
