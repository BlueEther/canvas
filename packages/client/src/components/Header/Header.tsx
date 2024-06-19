import { Button, Card, CardBody, Link } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { User } from "./User";
import { Debug } from "@sc07-canvas/lib/src/debug";
import React, { lazy } from "react";

const OpenChatButton = lazy(() => import("../Chat/OpenChatButton"));

const DynamicChat = () => {
  const { loadChat } = useAppContext();

  return <React.Suspense>{loadChat && <OpenChatButton />}</React.Suspense>;
};

export const Header = () => {
  const { connected } = useAppContext();

  return (
    <header id="main-header">
      <HeaderLeft />
      <div className="spacer"></div>
      {!connected && (
        <div>
          <Card>
            <CardBody>Disconnected</CardBody>
          </Card>
        </div>
      )}
      <div className="spacer"></div>
      <HeaderRight />
    </header>
  );
};

const HeaderLeft = () => {
  const { setInfoSidebar } = useAppContext();

  return (
    <div className="box">
      <Button onPress={() => setInfoSidebar(true)}>Info</Button>
      <Button onPress={() => Debug.openDebugTools()}>Debug Tools</Button>
    </div>
  );
};

const HeaderRight = () => {
  const { setSettingsSidebar, hasAdmin } = useAppContext();

  return (
    <div className="box">
      <User />
      <Button onClick={() => setSettingsSidebar(true)}>Settings</Button>
      {hasAdmin && (
        <Button href="/admin" target="_blank" as={Link}>
          Admin
        </Button>
      )}
      <DynamicChat />
    </div>
  );
};
