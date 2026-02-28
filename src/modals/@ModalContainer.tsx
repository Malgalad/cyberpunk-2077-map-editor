import * as React from "react";

import { useAppDispatch, useAppSelector } from "../hooks/hooks.ts";
import { ModalsActions, ModalsSelectors } from "../store/modals.ts";
import type { ModalProps, ModalType } from "../types/modals.ts";
import AlertModal from "./AlertModal.tsx";
import ConfirmByTypingModal from "./ConfirmByTypingModal.tsx";
import ConfirmModal from "./ConfirmModal.tsx";
import CriticalErrorModal from "./CriticalErrorModal.tsx";
import EditDistrictModal from "./EditDistrictModal/EditDistrictModal.tsx";
import ImportExportNodesModal from "./ImportExportNodesModal.tsx";
import LoadingModal from "./LoadingModal.tsx";
import ManageTemplatesModal from "./ManageTemplatesModal.tsx";
import ProjectModal from "./ProjectModal.tsx";
import UpdateNodeParentModal from "./UpdateNodeParentModal.tsx";

const ComponentMap: Record<ModalType, React.FC<ModalProps>> = {
  alert: AlertModal,
  critical: CriticalErrorModal,
  confirm: ConfirmModal,
  "confirm-by-typing": ConfirmByTypingModal,
  loading: LoadingModal,
  project: ProjectModal,
  "edit-district": EditDistrictModal,
  "import-export": ImportExportNodesModal,
  "update-node-parent": UpdateNodeParentModal,
  "manage-templates": ManageTemplatesModal,
};

function ModalContainer() {
  const modal = useAppSelector(ModalsSelectors.getModal);
  const dispatch = useAppDispatch();
  const onClose = React.useCallback(
    (reason?: unknown) => dispatch(ModalsActions.closeModal(reason)),
    [dispatch],
  );

  if (!modal) return null;

  const Component = ComponentMap[modal.type];

  return <Component data={modal.data} onClose={onClose} />;
}

export default ModalContainer;
