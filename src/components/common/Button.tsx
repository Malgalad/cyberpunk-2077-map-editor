import { LoaderCircle } from "lucide-react";
import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => void | Promise<void>;
  rounded?: boolean;
};

function Button({ rounded = false, onClick, children, ...props }: ButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const onClickAsync = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (!onClick) return;

      const result = onClick(event) as void | Promise<void>;

      if (result instanceof Promise) {
        setIsLoading(true);
        result.finally(() => setIsLoading(false));
      }

      return result;
    },
    [onClick],
  );

  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "border border-slate-500",
        "flex flex-row gap-1.5 items-center justify-center",
        "cursor-pointer p-1.5",
        "hover:not-disabled:border-slate-400 hover:not-disabled:bg-slate-600",
        "active:not-disabled:ring-2 active:not-disabled:ring-slate-500",
        "active:not-disabled:bg-slate-500 active:not-disabled:text-slate-900",
        "disabled:cursor-not-allowed disabled:text-gray-500",
        rounded && "rounded-md",
        props.className,
      )}
      disabled={props.disabled || isLoading}
      onClick={onClickAsync}
    >
      {children}
      {isLoading && <LoaderCircle className="animate-spin h-4 w-4" />}
    </button>
  );
}

export default Button;
