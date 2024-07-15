import { Slider, Spinner, Switch } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";

export const OverlaySettings = () => {
  const { blankOverlay, setBlankOverlay, heatmapOverlay, setHeatmapOverlay } =
    useAppContext();

  return (
    <div className="flex flex-col gap-4 p-2">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl">Overlays</h2>
        <p className="text-xs text-default-600">Overlays to display additional info over the canvas</p>
      </header>
      <section className="flex flex-col gap-2">
        <Switch
          isSelected={blankOverlay.enabled}
          onValueChange={(v) =>
            setBlankOverlay((vv) => ({ ...vv, enabled: v }))
          }
        >
          Blank Canvas Overlay
        </Switch>
        {blankOverlay.enabled && (
          <Slider
            label="Blank Canvas Opacity"
            step={0.1}
            minValue={0}
            maxValue={1}
            value={blankOverlay.opacity}
            onChange={(v) =>
              setBlankOverlay((vv) => ({ ...vv, opacity: v as number }))
            }
            getValue={(v) => (v as number) * 100 + "%"}
          />
        )}

        <Switch
          isSelected={heatmapOverlay.enabled}
          onValueChange={(v) =>
            setHeatmapOverlay((vv) => ({ ...vv, enabled: v }))
          }
        >
          {heatmapOverlay.loading && <Spinner size="sm" />}
          Heatmap Overlay
        </Switch>
        {heatmapOverlay.enabled && (
          <Slider
            label="Heatmap Opacity"
            step={0.1}
            minValue={0}
            maxValue={1}
            value={heatmapOverlay.opacity}
            onChange={(v) =>
              setHeatmapOverlay((vv) => ({ ...vv, opacity: v as number }))
            }
            getValue={(v) => (v as number) * 100 + "%"}
          />
        )}
      </section>
    </div>
  );
};
