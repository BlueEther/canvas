import { Button } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { AccountStanding } from "./AccountStanding";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Debug } from "@sc07-canvas/lib/src/debug";
import { faInfoCircle, faTools } from "@fortawesome/free-solid-svg-icons";
import African3 from '../../sounds/African3.mp3'
import useSound from "use-sound";
  
export const HeaderLeft = () => {
  const { setInfoSidebar, uiClickSound } = useAppContext();

  const [African3Sound] = useSound(
    African3,
    { volume: 0.5 }
  );

  return (
    <div className="box gap-2 flex">
      <AccountStanding />
      <Button 
        onPress={() => {
          setInfoSidebar(true)
          if (uiClickSound) {
            African3Sound()
          }
        }}
        variant="faded"
      >
        <FontAwesomeIcon icon={faInfoCircle} />
        <p>Info</p>
      </Button>
      {import.meta.env.DEV && (
        <Button 
          onPress={() => {
            Debug.openDebugTools()
            if (uiClickSound) {
              African3Sound()
            }
          }}
          variant="faded"
        >
          <FontAwesomeIcon icon={faTools} />
          <p>Debug Tools</p>
        </Button>
      )}
    </div>
  );
};