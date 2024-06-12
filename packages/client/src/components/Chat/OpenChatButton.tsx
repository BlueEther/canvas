import { Badge, Button, Link } from "@nextui-org/react";
import { useChatContext } from "../../contexts/ChatContext";
import { useAppContext } from "../../contexts/AppContext";

const OpenChatButton = () => {
  const { config } = useAppContext();
  const { notificationCount, doLogin } = useChatContext();

  return (
    <Badge
      content={notificationCount}
      isInvisible={notificationCount === 0}
      color="danger"
      size="sm"
    >
      {config?.chat?.element_host && <Button onPress={doLogin}>Chat</Button>}
    </Badge>
  );
};

export default OpenChatButton;
