import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";

export const CanvasMeta = () => {
  const { canvasPosition } = useAppContext();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <div id="canvas-meta">
        {canvasPosition && (
          <span>
            <button className="btn-link" onClick={onOpen}>
              ({canvasPosition.x}, {canvasPosition.y})
            </button>
          </span>
        )}
        <span>
          Pixels: <span>123</span>
        </span>
        <span>
          Users Online: <span>321</span>
        </span>
      </div>
      <ShareModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
};

const ShareModal = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: () => void;
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              share modal
            </ModalHeader>
            <ModalBody>
              <p>share the current zoom level & position as a url</p>
              <p>
                params would be not a hash so the server can generate an oembed
              </p>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
