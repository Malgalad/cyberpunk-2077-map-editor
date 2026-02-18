export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
  level?: number;
}

export interface DropdownContext {
  indent: boolean;
}
export interface DropdownTriggerContext {
  direction: "top" | "bottom" | "left" | "right";
  isTrigger: boolean;
}
