import { useCallback, useEffect, useState } from "react";
import { DynamicModal, IDynamicModal } from "../lib/alerts";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";

interface IModal {
  id: number;
  open: boolean;
  modal: IDynamicModal;
}

/**
 * React base to hold dynamic modals
 *
 * Dynamic modals are created via lib/alerts.tsx
 *
 * @returns
 */
export const DynamicModals = () => {
  const [modals, setModals] = useState<IModal[]>([]);

  const handleShowModal = useCallback(
    (modal: IDynamicModal) => {
      setModals((modals) => [
        ...modals,
        {
          id: Math.floor(Math.random() * 9999),
          open: true,
          modal,
        },
      ]);
    },
    [setModals]
  );

  const handleHideModal = useCallback(
    (modalId: number) => {
      setModals((modals_) => {
        const modals = [...modals_];

        if (modals.find((m) => m.id === modalId)) {
          modals.find((m) => m.id === modalId)!.open = false;
        }

        return modals;
      });

      setTimeout(() => {
        setModals((modals_) => {
          const modals = [...modals_];

          if (modals.find((m) => m.id === modalId)) {
            modals.splice(
              modals.indexOf(modals.find((m) => m.id === modalId)!),
              1
            );
          }

          return modals;
        });
      }, 1000);
    },
    [setModals]
  );

  useEffect(() => {
    DynamicModal.on("showModal", handleShowModal);

    return () => {
      DynamicModal.off("showModal", handleShowModal);
    };
  }, []);

  return (
    <>
      {modals.map(({ id, open, modal }) => (
        <Modal key={id} isOpen={open} onClose={() => handleHideModal(id)}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>{modal.title}</ModalHeader>
                <ModalBody>{modal.body}</ModalBody>
                <ModalFooter>
                  <Button onClick={onClose}>Close</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      ))}
    </>
  );
};
