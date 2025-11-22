import { clsx } from "../../utilities/utilities.ts";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <div
      className={clsx(
        `relative w-11 h-6 rounded-full transition-colors`,
        enabled && "bg-green-600",
        !enabled && "bg-slate-500",
      )}
      onClick={() => onChange(!enabled)}
    >
      <div
        className={clsx(
          `absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform`,
          enabled && "translate-x-5",
          !enabled && "translate-x-0",
        )}
      />
    </div>
  );
}

export default Toggle;
