import {
  Button,
  Kbd,
  KbdKey,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";
import { KeybindManager } from "../lib/keybinds";

export const KeybindModal = () => {
  const { showKeybinds, setShowKeybinds } = useAppContext();

  return (
    <Modal
      isOpen={showKeybinds}
      onOpenChange={setShowKeybinds}
      placement="center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Keybinds</ModalHeader>
            <ModalBody>
              {Object.entries(KeybindManager.getKeybinds()).map(
                ([name, kbs]) => (
                  <div className="flex flex-row gap-2">
                    <span>{name}</span>
                    {kbs.map((kb) => (
                      <Kbd
                        keys={(
                          [
                            kb.alt && "option",
                            kb.ctrl && "ctrl",
                            kb.meta && "command",
                            kb.shift && "shift",
                          ] as KbdKey[]
                        ).filter((a) => a)}
                      >
                        {kb.key}
                      </Kbd>
                    ))}
                  </div>
                )
              )}
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
