import { useTemplateContext } from "../../contexts/TemplateContext";
import { Input, Select, SelectItem, Slider, Switch } from "@nextui-org/react";

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
    style,
    setStyle,
    showMobileTools,
    setShowMobileTools,
  } = useTemplateContext();

  return (
    <div className="flex flex-col p-2">
      <header className="flex flex-col gap-2">
        <div className="flex items-center">
          <Switch
            size="sm"
            isSelected={enable || false}
            onValueChange={setEnable}
          />
          <h2 className="text-xl">Template</h2>
        </div>
        <p className="text-default-600 text-xs">Displaying an image over the canvas to help guide placing</p>
      </header>
      {enable && <section className="flex flex-col gap-2 mt-4">
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
        <Select
          label="Template Style"
          size="sm"
          selectedKeys={[style]}
          onChange={(e) => setStyle(e.target.value as any)}
        >
          <SelectItem key="SOURCE">Source</SelectItem>
          <SelectItem key="ONE_TO_ONE">One-to-one</SelectItem>
          <SelectItem key="ONE_TO_ONE_INCORRECT">
            One-to-one (keep incorrect)
          </SelectItem>
          <SelectItem key="DOTTED_SMALL">Dotted Small</SelectItem>
          <SelectItem key="DOTTED_BIG">Dotted Big</SelectItem>
          <SelectItem key="SYMBOLS">Symbols</SelectItem>
          <SelectItem key="NUMBERS">Numbers</SelectItem>
        </Select>
        {style !== "ONE_TO_ONE" && (
          <div>
            <b>Warning:</b> Template color picking only
            <br />
            works with one-to-one template style
          </div>
        )}
        <Switch
          className="md:hidden"
          isSelected={showMobileTools}
          onValueChange={setShowMobileTools}
        >
          Show Mobile Tools
        </Switch>
      </section>}
    </div>
  );
};
