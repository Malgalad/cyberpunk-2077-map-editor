import * as React from "react";

import { clsx } from "../utilities.ts";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  rounded?: boolean;
};

function Button({ rounded = false, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "border border-slate-500",
        "flex flex-row items-center justify-center",
        "cursor-pointer p-1.5",
        "hover:not-disabled:border-slate-400 hover:not-disabled:bg-slate-600",
        "active:not-disabled:ring-2 active:not-disabled:ring-slate-500",
        "active:not-disabled:bg-slate-500 active:not-disabled:text-slate-900",
        "disabled:cursor-not-allowed disabled:text-gray-500",
        rounded && "rounded-md",
        props.className,
      )}
    />
  );
}

export default Button;
