import * as React from "react";

import Button from "../components/common/Button.tsx";
import Input from "../components/common/Input.tsx";
import Modal from "../components/common/Modal.tsx";
import type { ModalProps } from "../types/modals.ts";

function ConfirmByTypingModal(props: ModalProps) {
  const [value, setValue] = React.useState("");
  const { children, password } = props.data as {
    children: React.ReactNode;
    password: string;
  };

  return (
    <Modal
      title={"Confirm action:"}
      footer={
        <>
          <Button className="mr-auto" onClick={() => props.onClose(false)}>
            Cancel
          </Button>
          <Button
            disabled={value !== password}
            onClick={() => props.onClose(true)}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div>{children}</div>
      <Input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={true}
        className="mt-2"
      />
    </Modal>
  );
}

export default ConfirmByTypingModal;
