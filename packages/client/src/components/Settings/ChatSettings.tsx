import { Switch } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import React, { lazy } from "react";

const InnerChatSettings = lazy(() => import("../Chat/InnerChatSettings"));

export const ChatSettings = () => {
  const { loadChat, setLoadChat } = useAppContext();

  return (
    <>
      <header>
        <Switch size="sm" isSelected={loadChat} onValueChange={setLoadChat} />
        <h2>Chat</h2>
      </header>
      <section>
        <React.Suspense>{loadChat && <InnerChatSettings />}</React.Suspense>
      </section>
    </>
  );
};
