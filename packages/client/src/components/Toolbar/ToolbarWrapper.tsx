import { useAppContext } from "../../contexts/AppContext";
import { useTemplateContext } from "../../contexts/TemplateContext";
import { MobileTemplateButtons } from "../Templating/MobileTemplateButtons";
import { CanvasMeta } from "./CanvasMeta";
import { Palette } from "./Palette";
import { UndoButton } from "./UndoButton";

/**
 * Wrapper for everything aligned at the bottom of the screen
 */
export const ToolbarWrapper = () => {
  const { config } = useAppContext();
  const { showMobileTools } = useTemplateContext();

  if (!config) return <></>;

  return (
    <div id="toolbar">
      <CanvasMeta />
      <UndoButton />
      {showMobileTools && <MobileTemplateButtons />}

      <Palette />
    </div>
  );
};
