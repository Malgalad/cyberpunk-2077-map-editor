export type ModalType =
  | "alert"
  | "critical"
  | "confirm"
  | "loading"
  | "project"
  | "custom-district"
  | "district-info"
  | "confirm-instance-exclusion";
export type Modal = {
  type: ModalType;
  data: unknown;
};
export type ModalProps = {
  data: unknown;
  onClose: (reason?: unknown) => void;
};
