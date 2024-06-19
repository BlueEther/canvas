import { useTemplateContext } from "../../contexts/TemplateContext";
import { Input, Slider, Switch } from "@nextui-org/react";

export const TemplateSettings = () => {
  const {
    enable,
    setEnable,
    url,
    setURL,
    width,
    setWidth,
    x,
    setX,
    y,
    setY,
    opacity,
    setOpacity,
    showMobileTools,
    setShowMobileTools,
  } = useTemplateContext();

  return (
    <>
      <header>
        <Switch
          size="sm"
          isSelected={enable || false}
          onValueChange={setEnable}
        />
        <h2>Template</h2>
      </header>
      <section>
        <Input
          label="Template URL"
          size="sm"
          value={url || ""}
          onValueChange={setURL}
        />
        <Input
          label="Template Width"
          size="sm"
          type="number"
          min="1"
          max={10_000}
          value={width?.toString() || ""}
          onValueChange={(v) => setWidth(parseInt(v))}
        />
        <div className="flex flex-row gap-1">
          <Input
            label="Template X"
            size="sm"
            type="number"
            value={x?.toString() || ""}
            onValueChange={(v) => setX(parseInt(v))}
          />
          <Input
            label="Template Y"
            size="sm"
            type="number"
            value={y?.toString() || ""}
            onValueChange={(v) => setY(parseInt(v))}
          />
        </div>
        <Slider
          label="Template Opacity"
          step={1}
          minValue={0}
          maxValue={100}
          value={opacity || 100}
          onChange={(v) => setOpacity(v as number)}
          getValue={(v) => v + "%"}
        />
        <Switch
          className="md:hidden"
          isSelected={showMobileTools}
          onValueChange={setShowMobileTools}
        >
          Show Mobile Tools
        </Switch>
      </section>
    </>
  );
};
