import { useAppContext } from "../../contexts/AppContext";
import { CanvasMeta } from "./CanvasMeta";
import { Palette } from "./Palette";
import { UndoButton } from "./UndoButton";

/**
 * Wrapper for everything aligned at the bottom of the screen
 */
export const ToolbarWrapper = () => {
  const { config } = useAppContext();

  if (!config) return <></>;

  return (
    <div id="toolbar">
      <CanvasMeta />
      <UndoButton />

      <Palette />
    </div>
  );
};
