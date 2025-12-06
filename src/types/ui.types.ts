export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
  level?: number;
}

export interface DropdownContext {
  level: number;
  indent: boolean;
}
