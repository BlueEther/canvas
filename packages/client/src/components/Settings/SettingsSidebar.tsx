import { Button } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { TemplateSettings } from "./TemplateSettings";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { ChatSettings } from "./ChatSettings";
import { OverlaySettings } from "../Overlay/OverlaySettings";

export const SettingsSidebar = () => {
  const { settingsSidebar, setSettingsSidebar, setShowKeybinds } =
    useAppContext();

  return (
    <div
      className="sidebar sidebar-right"
      style={{ ...(settingsSidebar ? {} : { display: "none" }) }}
    >
      <header>
        <h1>Settings</h1>
        <div className="flex-grow" />
        <Button size="sm" isIconOnly onClick={() => setSettingsSidebar(false)}>
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </header>
      <section>
        abc
        <Button
          onPress={() => {
            setShowKeybinds(true);
            setSettingsSidebar(false);
          }}
        >
          Keybinds
        </Button>
      </section>
      <TemplateSettings />
      <ChatSettings />
      <OverlaySettings />
    </div>
  );
};
