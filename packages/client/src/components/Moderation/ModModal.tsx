import {
  Button,
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
import { toast } from "react-toastify";
import { api, handleError } from "../../lib/utils";

export const ModModal = () => {
  const { showModModal, setShowModModal, hasAdmin } = useAppContext();
  const [bypassCooldown, setBypassCooldown_] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    start: [x: number, y: number];
    end: [x: number, y: number];
  }>();
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const previousClicks = Canvas.instance?.previousCanvasClicks;

    if (previousClicks && previousClicks.length === 2) {
      let start: [number, number] = [previousClicks[0].x, previousClicks[0].y];
      let end: [number, number] = [previousClicks[1].x, previousClicks[1].y];

      if (start[0] < end[0] && start[1] < end[1]) {
        setSelectedCoords({
          start,
          end,
        });
      } else {
        setSelectedCoords(undefined);
      }
    } else {
      setSelectedCoords(undefined);
    }
  }, [showModModal]);

  const setBypassCooldown = useCallback(
    (value: boolean) => {
      setBypassCooldown_(value);
      Canvas.instance?.setCooldownBypass(value);
    },
    [setBypassCooldown_]
  );

  const doUndoArea = useCallback(() => {
    if (!selectedCoords) return;
    if (
      !confirm(
        `Are you sure you want to undo (${selectedCoords.start.join(",")}) -> (${selectedCoords.end.join(",")})\n\nThis will affect ~${(selectedCoords.end[0] - selectedCoords.start[0]) * (selectedCoords.end[1] - selectedCoords.start[1])} pixels!`
      )
    ) {
      return;
    }

    setLoading(true);
    api("/api/admin/canvas/undo", "PUT", {
      start: { x: selectedCoords.start[0], y: selectedCoords.start[1] },
      end: { x: selectedCoords.end[0], y: selectedCoords.end[1] },
    })
      .then(({ status, data }) => {
        if (status === 200) {
          if (data.success) {
            toast.success(
              `Successfully undid area (${selectedCoords.start.join(",")}) -> (${selectedCoords.end.join(",")})`
            );
          } else {
            handleError({ status, data });
          }
        } else {
          handleError({ status, data });
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedCoords]);

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
              {selectedCoords && (
                <Button onPress={doUndoArea} isLoading={loading}>
                  Undo area ({selectedCoords.start.join(",")}) -&gt; (
                  {selectedCoords.end.join(",")})
                </Button>
              )}
              {!selectedCoords && (
                <>
                  right click two positions to get more options (first click
                  needs to be the top left most position)
                </>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
