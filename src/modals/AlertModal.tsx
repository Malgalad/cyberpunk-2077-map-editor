import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import type { ModalProps } from "../types/types.ts";

function AlertModal(props: ModalProps) {
  return (
    <Modal
      className="min-h-36"
      title={props.data as string}
      alignFooter="center"
      closeButton={false}
      footer={
        <Button rounded={true} className="w-12" onClick={() => props.onClose()}>
          OK
        </Button>
      }
    />
  );
}

export default AlertModal;
