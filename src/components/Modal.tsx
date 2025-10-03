import * as React from "react";

import { clsx } from "../utilities.ts";

interface ModalProps {
  children?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  title: string;
}

function Modal(props: ModalProps) {
  return (
    <dialog
      className="fixed inset-0 z-10 overflow-y-auto backdrop-blur-md bg-slate-900/70"
      open
    >
      <div className="flex items-center justify-center min-h-screen min-w-screen">
        <div
          className={clsx(
            "flex flex-col gap-4 p-4 border border-slate-600 rounded-lg",
            "bg-slate-900 text-white",
            "drop-shadow-lg drop-shadow-slate-900/50",
            !props.className?.match(/w-\d+/) && "w-96",
            props.className,
          )}
        >
          <div className="font-semibold text-lg">{props.title}</div>
          {props.children}
          {props.footer && (
            <div className="flex flex-row gap-2 justify-end">
              {props.footer}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

export default Modal;
