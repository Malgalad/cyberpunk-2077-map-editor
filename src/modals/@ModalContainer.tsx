import * as React from "react";

import { useAppDispatch, useAppSelector } from "../hooks.ts";
import { ModalsActions, ModalsSelectors } from "../store/modals.ts";
import AlertModal from "./AlertModal.tsx";
import ConfirmExclusionModal from "./ConfirmExclusionModal.tsx";
import ConfirmModal from "./ConfirmModal.tsx";
import CriticalErrorModal from "./CriticalErrorModal.tsx";
import CustomDistrictModal from "./CustomDistrictModal.tsx";
import DistrictInfoModal from "./DistrictInfoModal.tsx";
import ProjectModal from "./ProjectModal.tsx";

const ComponentMap = {
  alert: AlertModal,
  critical: CriticalErrorModal,
  confirm: ConfirmModal,
  project: ProjectModal,
  "custom-district": CustomDistrictModal,
  "district-info": DistrictInfoModal,
  "confirm-instance-exclusion": ConfirmExclusionModal,
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
