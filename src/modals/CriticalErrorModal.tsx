import Modal from "../components/common/Modal.tsx";
import type { ModalProps } from "../types/modals.ts";

function CriticalErrorModal(props: ModalProps) {
  return (
    <Modal
      closeButton={false}
      title="Critical error occured. Try reloading the page."
    >
      {props.data as string}
    </Modal>
  );
}

export default CriticalErrorModal;
