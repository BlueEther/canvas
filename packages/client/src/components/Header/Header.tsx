import { Card, CardBody } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import { EventInfoOverlay } from "../EventInfoOverlay";
import { HeaderLeft } from "./HeaderLeft";
import { HeaderRight } from "./HeaderRight";

export const Header = () => {
  const { connected } = useAppContext();

  return (
    <header id="main-header">
      {import.meta.env.VITE_INCLUDE_EVENT_INFO && <EventInfoOverlay />}
      <div className="flex justify-between w-full">
        <HeaderLeft />
        {!connected && (
          <div>
            <Card>
              <CardBody>Disconnected</CardBody>
            </Card>
          </div>
        )}
        <HeaderRight />
      </div>
    </header>
  );
};


