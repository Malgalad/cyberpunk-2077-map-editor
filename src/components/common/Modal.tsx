import { XIcon } from "lucide-react";
import * as React from "react";

import { useAppDispatch } from "../../hooks/hooks.ts";
import { ModalsActions } from "../../store/modals.ts";
import { clsx } from "../../utilities/utilities.ts";
import Button from "./Button.tsx";

interface ModalProps {
  alignFooter?: "start" | "center" | "end";
  backdrop?: boolean;
  children?: React.ReactNode;
  className?: string;
  closeButton?: boolean;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
  title?: React.ReactNode;
}

function Modal(props: ModalProps) {
  const [ping, setPing] = React.useState(false);
  const dispatch = useAppDispatch();
  const { alignFooter = "end", backdrop = true, closeButton = true } = props;

  return (
    <div
      className={clsx(
        "flex flex-row items-center justify-center min-h-screen min-w-screen",
        "fixed inset-0 overflow-y-auto z-[1200]",
        backdrop && "backdrop-blur-xs bg-slate-900/25",
        !backdrop && "pointer-events-none",
      )}
      onClick={() => {
        setPing(true);
        setTimeout(() => {
          setPing(false);
        }, 200);
      }}
    >
      <div
        className={clsx(
          "flex flex-col gap-4 p-4 border border-slate-600 rounded-lg",
          "bg-slate-900 text-white pointer-events-auto",
          "drop-shadow-lg drop-shadow-slate-900/50 relative",
          !props.className?.match(/w-.+\s/) && "w-96",
          ping && "animate-[wiggle_0.2s_ease-in-out_infinite]",
          props.className,
        )}
        style={props.style}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {(props.title || closeButton) && (
          <div
            className={clsx(
              "flex flex-row items-center gap-4",
              props.title && !closeButton && "justify-start",
              props.title && closeButton && "justify-between",
              !props.title && closeButton && "justify-end",
            )}
          >
            {props.title && (
              <div className="font-semibold text-lg grow">{props.title}</div>
            )}
            {closeButton && (
              <Button
                className="p-1! rounded-xs"
                onClick={() => dispatch(ModalsActions.closeModal())}
              >
                <XIcon />
              </Button>
            )}
          </div>
        )}
        {props.children}
        {props.footer && (
          <div
            className={clsx(
              "flex flex-row mt-auto",
              alignFooter === "end" && "justify-end",
              alignFooter === "center" && "justify-around",
              alignFooter === "start" && "justify-start",
            )}
          >
            <div className="flex flex-row gap-2">{props.footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
