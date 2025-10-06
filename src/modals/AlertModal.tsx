import Button from "../components/common/Button.tsx";
import Modal from "../components/common/Modal.tsx";
import { useAppDispatch } from "../hooks.ts";
import { ModalsActions } from "../store/modals.ts";

interface AlertModalProps {
  data: unknown;
}

function AlertModal(props: AlertModalProps) {
  const dispatch = useAppDispatch();

  return (
    <Modal
      title={props.data as string}
      footer={
        <Button
          rounded={true}
          className="w-12"
          onClick={() => dispatch(ModalsActions.closeModal())}
        >
          OK
        </Button>
      }
    />
  );
}

export default AlertModal;
