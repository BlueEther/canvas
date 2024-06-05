import { Switch } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";

export const OverlaySettings = () => {
  const { showVirginOverlay, setShowVirginOverlay } = useAppContext();

  return (
    <>
      <header>
        <h2>Overlays</h2>
      </header>
      <section>
        <Switch
          isSelected={showVirginOverlay}
          onValueChange={setShowVirginOverlay}
        >
          Virgin Map Overlay
        </Switch>
      </section>
    </>
  );
};
