export type ModalType =
  | "alert"
  | "critical"
  | "confirm"
  | "confirm-by-typing"
  | "loading"
  | "project"
  | "edit-district"
  | "confirm-instance-exclusion";
export type Modal = {
  type: ModalType;
  data: unknown;
};
export type ModalProps = {
  data: unknown;
  onClose: (reason?: unknown) => void;
};
