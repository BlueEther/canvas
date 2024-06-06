import { useEffect } from "react";
import { Debug, FlagCategory } from "@sc07-canvas/lib/src/debug";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  useDisclosure,
} from "@nextui-org/react";

export const DebugModal = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    const handleOpen = () => {
      onOpen();
    };

    Debug.on("openTools", handleOpen);

    return () => {
      Debug.off("openTools", handleOpen);
    };
  }, []);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Debug Tools
            </ModalHeader>
            <ModalBody>
              <Button onPress={() => Debug.openDebug()}>
                Open Debug Information
              </Button>
              {Debug.flags.getAll().map((flag, i, arr) => (
                <>
                  {arr[i - 1]?.category !== flag.category && (
                    <p>{FlagCategory[flag.category]}</p>
                  )}
                  <div key={flag.id}>
                    <Switch
                      size="sm"
                      defaultSelected={flag.enabled}
                      onValueChange={(v) => Debug.flags.setEnabled(flag.id, v)}
                    >
                      {flag.id}
                    </Switch>
                  </div>
                </>
              ))}
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
