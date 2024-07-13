import { Button } from "@nextui-org/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export type InfoHeaderProps = { 
  setInfoSidebar: (value: boolean) => void 
}

export const InfoHeader = ({ setInfoSidebar }: InfoHeaderProps) => {
  return (
    <header className="flex p-2 justify-between items-center">
      <div>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faInfoCircle} size="lg" />
          <div>
            <h1 className="text-xl">Info</h1>
            <p className="text-xs text-default-600">Information about the event</p>
          </div>
        </div>
        
      </div>

      <Button size="sm" isIconOnly onClick={() => setInfoSidebar(false)}>
        <FontAwesomeIcon icon={faXmark} />
      </Button>
    </header>
  );
};
