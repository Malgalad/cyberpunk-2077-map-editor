import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import type { ModalProps } from "../types/modals.ts";

function ConfirmExclusionModal(props: ModalProps) {
  const { index, position } = props.data as {
    index: number;
    position: [number, number];
  };

  return (
    <Modal
      backdrop={false}
      className={`fixed! w-64 -translate-y-1/2`}
      style={{ left: position[0] + 15, top: position[1] }}
      title={`Hide instance #${index}?`}
    >
      <div className="flex flex-row justify-between">
        <Button className="w-16" onClick={() => props.onClose(false)}>
          No
        </Button>
        <Button className="w-16" onClick={() => props.onClose(true)}>
          Yes
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmExclusionModal;
