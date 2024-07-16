import { Button, Link } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { User } from "./User";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { faGear, faHammer } from "@fortawesome/free-solid-svg-icons";
import React, { lazy } from "react";
import African3 from '../../sounds/African3.mp3'
import useSound from "use-sound";

const OpenChatButton = lazy(() => import("../Chat/OpenChatButton"));

const DynamicChat = () => {
  const { loadChat } = useAppContext();

  return <React.Suspense>{loadChat && <OpenChatButton />}</React.Suspense>;
};

export const HeaderRight = () => {
  const { setSettingsSidebar, hasAdmin, uiClickSound } = useAppContext();
  
  const [African3Sound] = useSound(
    African3,
    { volume: 0.5 }
  );

  return (
    <div className="box flex flex-col gap-2">
      <User />
      <div className="flex gap-2">
        <Button 
          onClick={() => {
            setSettingsSidebar(true)
            if (uiClickSound) {
              African3Sound()
            }
          }}
          variant="faded"
        >
          <FontAwesomeIcon icon={faGear} />
          <p>Settings</p>
        </Button>
        <ThemeSwitcher />
        {hasAdmin && (
          <Button href="/admin" target="_blank" as={Link}  variant="faded" >
            <FontAwesomeIcon icon={faHammer} />
            <p>Admin</p>
          </Button>
        )}
        <DynamicChat />
      </div>
    </div>
  );
};