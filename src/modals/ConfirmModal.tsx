import Button from "../components/Button.tsx";
import Modal from "../components/Modal.tsx";
import { useAppDispatch } from "../hooks.ts";
import { ModalsActions } from "../store/modals.ts";

interface ConfirmModalProps {
  data: unknown;
}

function ConfirmModal(props: ConfirmModalProps) {
  const dispatch = useAppDispatch();

  return (
    <Modal
      title={"Confirm action:"}
      footer={
        <>
          <Button
            className="mr-auto"
            onClick={() => dispatch(ModalsActions.closeModal(false))}
          >
            Cancel
          </Button>
          <Button onClick={() => dispatch(ModalsActions.closeModal(true))}>
            Confirm
          </Button>
        </>
      }
    >
      <div>{props.data as string}</div>
    </Modal>
  );
}

export default ConfirmModal;
