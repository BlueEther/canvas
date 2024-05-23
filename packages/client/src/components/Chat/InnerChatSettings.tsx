import { Button } from "@nextui-org/react";
import { useChatContext } from "../../contexts/ChatContext";

const InnerChatSettings = () => {
  const { user, doLogin, doLogout } = useChatContext();

  return (
    <>
      {!user && <Button onClick={doLogin}>Login</Button>}
      {user && (
        <>
          <div className="flex gap-1">
            <div className="flex-grow">{user.userId}</div>
            <Button onClick={doLogout}>Logout</Button>
          </div>
        </>
      )}
    </>
  );
};

export default InnerChatSettings;
