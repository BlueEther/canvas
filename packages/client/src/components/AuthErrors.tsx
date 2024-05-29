import {
  Button,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { useEffect, useState } from "react";

const Params = {
  TYPE: "auth_type",
  ERROR: "auth_error",
  ERROR_DESC: "auth_error_desc",
  CAN_RETRY: "auth_retry",
};

/**
 * Show popups that detail auth error messages
 * @returns
 */
export const AuthErrors = () => {
  const [params, setParams] = useState(
    new URLSearchParams(window.location.search)
  );

  const onClose = () => {
    const url = new URL(window.location.href);
    url.search = "";
    // window.history.replaceState({}, "", url.toString());

    setParams(new URLSearchParams(window.location.search));
  };

  return (
    <>
      <RPError
        isOpen={params.get(Params.TYPE) === "rp"}
        onClose={onClose}
        params={params}
      />
      <OPError
        isOpen={params.get(Params.TYPE) === "op"}
        onClose={onClose}
        params={params}
      />
    </>
  );
};

/**
 * This is for RP errors, which can be triggered by modifying data sent in callbacks
 *
 * These errors can typically be retried
 *
 * @param param0
 * @returns
 */
const RPError = ({
  isOpen,
  onClose,
  params,
}: {
  isOpen: boolean;
  onClose: () => void;
  params: URLSearchParams;
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} isDismissable={false}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Login Error</ModalHeader>
            <ModalBody>
              <b>Error:</b> {params.get(Params.ERROR)}
              <br />
              <br />
              <b>Error Description:</b> {params.get(Params.ERROR_DESC)}
            </ModalBody>
            <ModalFooter>
              <Button color="primary" href="/api/login" as={Link}>
                Login
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

/**
 * This is for OP errors, these might not be retryable
 * @param param0
 * @returns
 */
const OPError = ({
  isOpen,
  onClose,
  params,
}: {
  isOpen: boolean;
  onClose: () => void;
  params: URLSearchParams;
}) => {
  const canRetry = params.has(Params.CAN_RETRY);
  const [error, setError] = useState(params.get(Params.ERROR));
  const [errorDesc, setErrorDesc] = useState(params.get(Params.ERROR_DESC));

  useEffect(() => {
    switch (params.get(Params.ERROR)) {
      case "invalid_grant":
        setErrorDesc("Invalid token, try logging in again");
        break;
    }
  }, [params]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} isDismissable={false}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Login Error</ModalHeader>
            <ModalBody>
              <b>Error:</b> {error}
              <br />
              <br />
              <b>Error Description:</b> {errorDesc}
            </ModalBody>
            <ModalFooter>
              {canRetry && (
                <Button color="primary" href="/api/login" as={Link}>
                  Login
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
