import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import type { ModalProps } from "../types/modals.ts";

function ConfirmModal(props: ModalProps) {
  return (
    <Modal
      title={"Confirm action:"}
      footer={
        <>
          <Button className="mr-auto" onClick={() => props.onClose(false)}>
            Cancel
          </Button>
          <Button onClick={() => props.onClose(true)}>Confirm</Button>
        </>
      }
    >
      <div>{props.data as string}</div>
    </Modal>
  );
}

export default ConfirmModal;
