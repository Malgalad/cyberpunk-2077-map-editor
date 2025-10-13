import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import { useAppDispatch } from "../hooks.ts";
import { ModalsActions } from "../store/modals.ts";

interface ConfirmExclusionModalProps {
  data: unknown;
}

function ConfirmExclusionModal(props: ConfirmExclusionModalProps) {
  const dispatch = useAppDispatch();
  const { index, position } = props.data as {
    index: number;
    position: [number, number];
  };

  return (
    <Modal
      backdrop={false}
      className={`absolute w-64 -translate-y-1/2`}
      style={{ left: position[0] + 15, top: position[1] }}
      title={`Exclude instance #${index}?`}
    >
      <div className="flex flex-row justify-between">
        <Button
          className="w-16"
          onClick={() => dispatch(ModalsActions.closeModal(false))}
        >
          No
        </Button>
        <Button
          className="w-16"
          onClick={() => dispatch(ModalsActions.closeModal(true))}
        >
          Yes
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmExclusionModal;
