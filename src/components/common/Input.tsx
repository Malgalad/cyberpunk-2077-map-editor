import * as React from "react";

import { clsx } from "../../utilities.ts";

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
    <input
      {...props}
      className={clsx(
        "border border-slate-600 p-1.5",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "read-only:cursor-default read-only:opacity-85",
        props.className,
      )}
      value={props.onChange ? value : props.value}
      onChange={onChange}
    />
  );
}

export default Input;
