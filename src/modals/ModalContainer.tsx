import { useAppSelector } from "../hooks.ts";
import { ModalsSelectors } from "../store/modals.ts";
import AlertModal from "./AlertModal.tsx";
import ConfirmModal from "./ConfirmModal.tsx";
import CustomDistrictModal from "./CustomDistrictModal.tsx";
import DistrictModal from "./DistrictModal.tsx";

function ModalContainer() {
  const modal = useAppSelector(ModalsSelectors.getModal);

  if (!modal) return null;
  if (modal.type === "alert") return <AlertModal data={modal.data} />;
  if (modal.type === "confirm") return <ConfirmModal data={modal.data} />;
  if (modal.type === "select-district") return <DistrictModal />;
  if (modal.type === "custom-district") return <CustomDistrictModal />;
}

export default ModalContainer;
