import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { useEffect, useState } from "react";
import { IUser, UserCard } from "./UserCard";
import { api, handleError } from "../../lib/utils";

export const ProfileModal = () => {
  const { profile, setProfile } = useAppContext();
  const [user, setUser] = useState<IUser>();

  useEffect(() => {
    if (!profile) {
      setUser(undefined);
      return;
    }

    api<{ user: IUser }>("/api/user/" + profile).then(({ status, data }) => {
      if (status === 200 && data.success) {
        setUser(data.user);
      } else {
        handleError({ status, data });
      }
    });
  }, [profile]);

  return (
    <Modal isOpen={!!profile} onClose={() => setProfile()} placement="center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Profile</ModalHeader>
            <ModalBody>
              {user ? <UserCard user={user} /> : <>Loading...</>}
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
