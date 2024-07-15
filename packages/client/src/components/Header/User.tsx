import { Card, User as UserElement } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";

export const User = () => {
  const { user } = useAppContext();

  return user ? (
    <Card>
      <UserElement
        name={user.user.username}
        description={user.service.instance.hostname}
        avatarProps={{
          showFallback: true,
          name: undefined,
          src: user.user.picture_url
        }}
        className="p-2"
      />
    </Card>
  ) : (
    <></>
  );
};