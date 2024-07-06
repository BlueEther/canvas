import { IAccountStanding } from "@sc07-canvas/lib/src/net";
import { useCallback, useEffect, useState } from "react";
import network from "../../lib/network";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";

export const AccountStanding = () => {
  const [standingInfo, setStandingInfo] = useState(false);
  const [standing, setStanding] = useState<IAccountStanding | undefined>(
    network.getState("standing")?.[0]
  );

  const handleStanding = useCallback(
    (standing: IAccountStanding) => {
      setStanding(standing);
    },
    [setStanding]
  );

  useEffect(() => {
    network.on("standing", handleStanding);

    return () => {
      network.off("standing", handleStanding);
    };
  }, []);

  return (
    <>
      {standing?.banned && (
        <div className="bg-red-500 bg-opacity-85 border-red-700 border-1 rounded-md p-1 flex items-center gap-2">
          You are banned
          <br />
          <Button size="sm" onPress={() => setStandingInfo(true)}>
            Details
          </Button>
        </div>
      )}

      <Modal isOpen={standingInfo} onClose={() => setStandingInfo(false)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Account Standing</ModalHeader>
              <ModalBody>
                {standing?.banned ? (
                  <>
                    You are banned until {standing.until}
                    <br />
                    {standing.reason ? (
                      <>Public reason given: {standing.reason}</>
                    ) : (
                      <>No reason given</>
                    )}
                  </>
                ) : (
                  <>Your account is in good standing</>
                )}
              </ModalBody>
              <ModalFooter>
                <Button onPress={onClose}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
