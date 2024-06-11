import { Button, Card, CardBody, Link } from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";
import { User } from "./Header/User";
import { Debug } from "@sc07-canvas/lib/src/debug";
import React, { lazy } from "react";

const OpenChatButton = lazy(() => import("./Chat/OpenChatButton"));

const DynamicChat = () => {
  const { loadChat } = useAppContext();

  return <React.Suspense>{loadChat && <OpenChatButton />}</React.Suspense>;
};

export const Header = () => {
  const { setSettingsSidebar, connected, hasAdmin, setInfoSidebar } =
    useAppContext();

  return (
    <header id="main-header">
      <div className="box">
        <Button onPress={() => setInfoSidebar(true)}>Info</Button>
      </div>
      <div className="spacer"></div>
      {!connected && (
        <div>
          <Card>
            <CardBody>Disconnected</CardBody>
          </Card>
        </div>
      )}
      <div className="spacer"></div>
      <div className="box">
        <User />
        <Button onClick={() => setSettingsSidebar(true)}>Settings</Button>
        <Button onClick={() => Debug.openDebugTools()}>debug</Button>
        {hasAdmin && (
          <Button href="/admin" target="_blank" as={Link}>
            Admin
          </Button>
        )}
        <DynamicChat />
      </div>
    </header>
  );
};
