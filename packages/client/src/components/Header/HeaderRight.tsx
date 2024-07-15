import { Button, Link } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { User } from "./User";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { faGear, faHammer } from "@fortawesome/free-solid-svg-icons";
import React, { lazy } from "react";

const OpenChatButton = lazy(() => import("../Chat/OpenChatButton"));

const DynamicChat = () => {
  const { loadChat } = useAppContext();

  return <React.Suspense>{loadChat && <OpenChatButton />}</React.Suspense>;
};

export const HeaderRight = () => {
  const { setSettingsSidebar, hasAdmin } = useAppContext();

  return (
    <div className="box flex flex-col gap-2">
      <User />
      <div className="flex gap-2">
        <Button 
          onClick={() => setSettingsSidebar(true)}
          variant="ghost"
        >
          <FontAwesomeIcon icon={faGear} />
          <p>Settings</p>
        </Button>
        <ThemeSwitcher />
        {hasAdmin && (
          <Button href="/admin" target="_blank" as={Link}  variant="ghost" >
            <FontAwesomeIcon icon={faHammer} />
            <p>Admin</p>
          </Button>
        )}
        <DynamicChat />
      </div>
    </div>
  );
};