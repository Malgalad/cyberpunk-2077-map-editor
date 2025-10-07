import * as React from "react";

import { clsx } from "../../utilities.ts";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  items: Array<{
    label: string;
    value: string;
    disabled?: boolean;
    level?: number;
  }>;
};
const nbsp = "\u00A0";

function Select({ items, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={clsx(
        "border border-slate-600 bg-slate-800 text-white p-2",
        props.className,
      )}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value} disabled={item.disabled}>
          {nbsp.repeat((item.level ?? 0) * 3)}
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default Select;
