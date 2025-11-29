import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [value, setValue] = React.useState(props.value);
  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);

      props.onChange?.(event);
    },
    [props],
  );

  return (
    <div
      className={clsx("w-min", props["aria-invalid"] && "tooltip")}
      data-tooltip={props["aria-errormessage"] ?? ""}
      data-flow="top"
    >
      <input
        {...props}
        className={clsx(
          "border p-1.5",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:cursor-default read-only:opacity-85",
          !props["aria-invalid"] && "border-slate-600",
          props["aria-invalid"] && "border-red-500",
          props.className,
        )}
        value={props.onChange ? value : props.value}
        onChange={onChange}
      />
    </div>
  );
}

export default Input;
