import { Switch } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import React, { lazy } from "react";

const InnerChatSettings = lazy(() => import("../Chat/InnerChatSettings"));

export const ChatSettings = () => {
  const { loadChat, setLoadChat } = useAppContext();

  return (
    <div className="flex flex-col p-2">
      <header className="flex flex-col gap-2">
        <div className="flex items-center">
          <Switch
            size="sm"
            isSelected={loadChat || false}
            onValueChange={setLoadChat}
          />
          <h2 className="text-xl">Chat</h2>
        </div>
        <p className="text-default-600 text-xs">Chatting with other canvas users</p>
      </header>
      <section>
        <React.Suspense>{loadChat && 
          <div className="mt-4">
            <InnerChatSettings />
          </div>  
        }</React.Suspense>
      </section>
    </div>
  );
};
