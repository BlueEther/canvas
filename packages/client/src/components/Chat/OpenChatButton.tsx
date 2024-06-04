import { Badge, Button, Link } from "@nextui-org/react";
import { useChatContext } from "../../contexts/ChatContext";
import { useAppContext } from "../../contexts/AppContext";

const OpenChatButton = () => {
  const { config } = useAppContext();
  const { notificationCount } = useChatContext();

  return (
    <Badge
      content={notificationCount}
      isInvisible={notificationCount === 0}
      color="danger"
      size="sm"
    >
      <Button as={Link} href={config.chat.element_host} target="_blank">
        Chat
      </Button>
    </Badge>
  );
};

export default OpenChatButton;
