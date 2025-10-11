import * as React from "react";

import { usePreviousValue } from "../../hooks.ts";

interface DropdownProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger: React.ReactElement<{ onClick?: (event: any) => void }>;
  children: React.ReactNode;
}

function Dropdown({ trigger, children }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const wasOpen = usePreviousValue(isOpen);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen && !wasOpen) {
      document.addEventListener("click", listener);
    }

    return () => {
      if (!isOpen && wasOpen) {
        document.removeEventListener("click", listener);
      }
    };
  }, [isOpen, wasOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {React.cloneElement(trigger, {
        onClick: () => {
          setIsOpen(!isOpen);
        },
      })}
      {isOpen && (
        <div className="absolute top-full right-0 z-10 w-[150px] bg-slate-800 border border-slate-900 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
