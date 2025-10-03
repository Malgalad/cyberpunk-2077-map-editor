import { nanoid } from "nanoid";
import * as React from "react";

import { clsx } from "../utilities.ts";

interface SelectProps {
  className?: string;
  label: string;
  items: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  value: string;
}

function Select(props: SelectProps) {
  const id = React.useMemo(() => nanoid(12), []);

  return (
    <div className="flex flex-row items-center gap-1.5">
      {props.label && <label htmlFor={`select-${id}`}>{props.label}</label>}
      <select
        className={clsx(
          "border border-slate-600 bg-slate-800 text-white p-2",
          props.className,
        )}
        id={`select-${id}`}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
