import {
  CheckIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Icon,
} from "lucide-react";
import * as React from "react";

import { clsx } from "../../../utilities/utilities.ts";
import {
  useDropdownContext,
  useDropdownTriggerContext,
} from "./dropdown.context.ts";

interface DropdownItemProps {
  checked?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactElement<Parameters<typeof Icon>[0]>;
  onClick?: () => void;
}

function DropdownItem(props: DropdownItemProps) {
  const { checked, children, className, disabled, icon, onClick, ...rest } =
    props;
  const { indent } = useDropdownContext();
  const { direction, isTrigger } = useDropdownTriggerContext();
  const iconProps = {
    size: 20,
    className: clsx(disabled ? "text-gray-400" : "text-slate-300", "shrink-0"),
  };
  const leftIcon =
    icon ||
    (checked ? (
      <CheckIcon />
    ) : (
      isTrigger && direction === "left" && <ChevronLeft />
    ));
  const rightIcon = isTrigger && (
    <div className="ml-auto shrink-0">
      {direction === "right" && <ChevronRight {...iconProps} />}
      {direction === "top" && <ChevronUp {...iconProps} />}
      {direction === "bottom" && <ChevronDown {...iconProps} />}
    </div>
  );

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 cursor-default select-none",
        "px-2 py-1.5",
        disabled && "text-gray-400",
        !disabled && "hover:bg-slate-600",
        className,
      )}
      onClick={() => !disabled && onClick?.()}
      {...rest}
    >
      {leftIcon && React.cloneElement(leftIcon, iconProps)}
      <div className={clsx(!leftIcon && indent && "ml-7", "truncate w-full")}>
        {children}
      </div>
      {rightIcon}
    </div>
  );
}

export default DropdownItem;
