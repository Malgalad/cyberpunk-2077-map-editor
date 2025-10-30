import { LoaderCircle } from "lucide-react";

import Modal from "../components/common/Modal.tsx";

function LoadingModal() {
  return (
    <Modal title={""} className="w-min!" closeButton={false}>
      <div className="w-16 h-16 flex flex-row justify-center items-center animate-spin text-white">
        <LoaderCircle size={52} />
      </div>
    </Modal>
  );
}

export default LoadingModal;
