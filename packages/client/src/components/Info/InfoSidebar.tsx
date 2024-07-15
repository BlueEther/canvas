import { useAppContext } from "../../contexts/AppContext";
import { InfoText } from "./InfoText";
import { InfoButtons } from "./InfoButtons";
import { SidebarBase } from "../SidebarBase";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

/**
 * Information sidebar
 *
 * TODO: add customization for this post-event (#46)
 *
 * @returns
 */
export const InfoSidebar = () => {
  const { infoSidebar, setInfoSidebar } = useAppContext();

  return (
    <SidebarBase shown={infoSidebar} setSidebarShown={setInfoSidebar} icon={faInfoCircle} title="Info" description="Information about the event" side="Left">
      <div className="flex flex-col h-full justify-between">
        <div>
          <InfoButtons />
          <InfoText />
        </div>
        <div className="p-2">
          <p className="text-xs text-default-600">Build {__COMMIT_HASH__}</p>
          <div id="grecaptcha-badge"></div>
        </div>
      </div>
      
    </SidebarBase>
  )
};