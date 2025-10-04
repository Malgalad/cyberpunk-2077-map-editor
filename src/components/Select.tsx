import * as React from "react";

import { clsx } from "../utilities.ts";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  items: Array<{ label: string; value: string }>;
};

function Select(props: SelectProps) {
  return (
    <select
      className={clsx(
        "border border-slate-600 bg-slate-800 text-white p-2",
        props.className,
      )}
      {...props}
    >
      {props.items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default Select;
