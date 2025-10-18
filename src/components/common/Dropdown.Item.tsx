import { CheckIcon, ChevronRight, Icon } from "lucide-react";
import * as React from "react";

import { clsx } from "../../utilities.ts";

interface DropdownItemProps {
  checked?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactElement<Parameters<typeof Icon>[0]>;
  isExpandable?: boolean;
  onClick?: () => void;
}

function DropdownItem(props: DropdownItemProps) {
  const {
    checked,
    children,
    className,
    disabled,
    icon,
    isExpandable,
    onClick,
  } = props;
  const iconProps = { size: 20, className: "text-slate-300 shrink-0" };

  return (
    <div
      className={clsx(
        "flex flex-row items-center gap-2 cursor-default select-none",
        "px-2 py-1.5",
        disabled && "opacity-50",
        !disabled && "hover:bg-slate-600",
        className,
      )}
      onClick={() => !disabled && onClick?.()}
    >
      {checked && !icon && <CheckIcon {...iconProps} />}
      {icon ? React.cloneElement(icon, iconProps) : null}
      <div className={clsx(!(icon || checked) && "ml-7", "truncate w-full")}>
        {children}
      </div>
      {isExpandable && (
        <ChevronRight className="ml-auto text-slate-300" size={20} />
      )}
    </div>
  );
}

export default DropdownItem;
