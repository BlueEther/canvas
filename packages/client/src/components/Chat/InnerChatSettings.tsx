import { Button } from "@nextui-org/react";
import { useChatContext } from "../../contexts/ChatContext";
import { useAppContext } from "../../contexts/AppContext";

const InnerChatSettings = () => {
  const { user: authUser } = useAppContext();
  const { user, doLogin, doLogout } = useChatContext();

  if (!authUser) {
    return <>You must be logged in first</>;
  }

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
