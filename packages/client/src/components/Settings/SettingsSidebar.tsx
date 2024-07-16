import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useAppContext } from "../../contexts/AppContext";
import { SidebarBase } from "../SidebarBase";
import { Button, Divider } from "@nextui-org/react";
import { TemplateSettings } from "./TemplateSettings";
import { ChatSettings } from "./ChatSettings";
import { OverlaySettings } from "../Overlay/OverlaySettings";
import { AudioSettings } from "./AudioSettings";

export const SettingsSidebar = () => {
  const { settingsSidebar, setSettingsSidebar, setShowKeybinds } = useAppContext();

  return (
    <SidebarBase shown={settingsSidebar} setSidebarShown={setSettingsSidebar} icon={faGear}  title="Settings" description="Configuration options for customizing your experience" side="Right">
      <div className="p-4 flex flex-col gap-4">
        <TemplateSettings />
        <Divider />
        <ChatSettings />
        <Divider />
        <OverlaySettings />
        <Divider />
        <AudioSettings />
        <Divider />
        <section>
          <Button
            onPress={() => {
              setShowKeybinds(true);
              setSettingsSidebar(false);
            }}
          >
            Keybinds
          </Button>
        </section>
      </div>
    </SidebarBase>
  )
};