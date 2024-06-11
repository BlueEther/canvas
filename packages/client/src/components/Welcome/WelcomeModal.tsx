import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react";

/**
 * Welcome popup
 *
 * TODO: customization post-event (#46)
 *
 * @returns
 */
export const WelcomeModal = () => {
  const { isOpen, onClose } = useDisclosure({
    defaultOpen: !localStorage.getItem("hide_welcome"),
  });

  const handleClose = () => {
    localStorage.setItem("hide_welcome", "true");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Welcome</ModalHeader>
            <ModalBody>
              <h1 className="text-4xl text-center">Welcome to Canvas!</h1>
              <p>
                Canvas is a collaborative pixel placing event that uses
                Fediverse accounts
              </p>
              <p>More information can be found in the top left</p>
            </ModalBody>
            <ModalFooter>
              <Button onPress={onClose}>Close</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
