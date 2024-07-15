import { Button } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { AccountStanding } from "./AccountStanding";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Debug } from "@sc07-canvas/lib/src/debug";
import { faInfoCircle, faTools } from "@fortawesome/free-solid-svg-icons";

export const HeaderLeft = () => {
  const { setInfoSidebar } = useAppContext();

  return (
    <div className="box gap-2 flex">
      <AccountStanding />
      <Button 
        onPress={() => setInfoSidebar(true)}
        variant="faded"
      >
        <FontAwesomeIcon icon={faInfoCircle} />
        <p>Info</p>
      </Button>
      {import.meta.env.DEV && (
        <Button 
          onPress={() => Debug.openDebugTools()}
          variant="faded"
        >
          <FontAwesomeIcon icon={faTools} />
          <p>Debug Tools</p>
        </Button>
      )}
    </div>
  );
};