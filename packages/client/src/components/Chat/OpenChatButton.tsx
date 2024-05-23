import { Badge, Button } from "@nextui-org/react";
import { useChatContext } from "../../contexts/ChatContext";

const OpenChatButton = () => {
  const { notificationCount } = useChatContext();

  return (
    <Badge
      content={notificationCount}
      isInvisible={notificationCount === 0}
      color="danger"
      size="sm"
    >
      <Button>Chat</Button>
    </Badge>
  );
};

export default OpenChatButton;
