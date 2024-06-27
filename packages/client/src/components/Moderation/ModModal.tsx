import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Switch,
} from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { useCallback, useEffect, useState } from "react";
import { KeybindManager } from "../../lib/keybinds";
import { Canvas } from "../../lib/canvas";

export const ModModal = () => {
  const { showModModal, setShowModModal, hasAdmin } = useAppContext();
  const [bypassCooldown, setBypassCooldown_] = useState(false);

  useEffect(() => {
    setBypassCooldown_(Canvas.instance?.getCooldownBypass() || false);

    const handleKeybind = () => {
      if (!hasAdmin) {
        console.warn("Unable to open mod menu; hasAdmin is not set");
        return;
      }

      setShowModModal((m) => !m);
    };

    KeybindManager.on("TOGGLE_MOD_MENU", handleKeybind);

    return () => {
      KeybindManager.off("TOGGLE_MOD_MENU", handleKeybind);
    };
  }, [hasAdmin]);

  const setBypassCooldown = useCallback(
    (value: boolean) => {
      setBypassCooldown_(value);
      Canvas.instance?.setCooldownBypass(value);
    },
    [setBypassCooldown_]
  );

  return (
    <Modal isOpen={showModModal} onOpenChange={setShowModModal}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Mod Menu</ModalHeader>
            <ModalBody>
              <Switch
                isSelected={bypassCooldown}
                onValueChange={setBypassCooldown}
              >
                Bypass placement cooldown
              </Switch>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
