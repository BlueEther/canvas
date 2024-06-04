import { Badge, Button, Link } from "@nextui-org/react";
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
      <Button
        as={Link}
        href={import.meta.env.VITE_ELEMENT_HOST!}
        target="_blank"
      >
        Chat
      </Button>
    </Badge>
  );
};

export default OpenChatButton;
