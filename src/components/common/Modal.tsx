import * as React from "react";

import { clsx } from "../../utilities.ts";

interface ModalProps {
  backdrop?: boolean;
  children?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
  title: React.ReactNode;
}

function Modal(props: ModalProps) {
  const { backdrop = true } = props;

  return (
    <div
      className={clsx(
        "flex flex-row items-center justify-center min-h-screen min-w-screen",
        "fixed inset-0 z-10 overflow-y-auto",
        backdrop && "backdrop-blur-md bg-slate-900/70",
        !backdrop && "pointer-events-none",
      )}
    >
      <div
        className={clsx(
          "flex flex-col gap-4 p-4 border border-slate-600 rounded-lg",
          "bg-slate-900 text-white pointer-events-auto",
          "drop-shadow-lg drop-shadow-slate-900/50",
          !props.className?.match(/w-\d+/) && "w-96",
          props.className,
        )}
        style={props.style}
      >
        <div className="font-semibold text-lg">{props.title}</div>
        {props.children}
        {props.footer && (
          <div className="flex flex-row gap-2 justify-end">{props.footer}</div>
        )}
      </div>
    </div>
  );
}

export default Modal;
