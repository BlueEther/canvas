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
  } = useTemplateContext();

  return (
    <>
      <header>
        <Switch size="sm" isSelected={enable} onValueChange={setEnable} />
        <h2>Template</h2>
      </header>
      <section>
        <Input
          label="Template URL"
          size="sm"
          value={url}
          onValueChange={setURL}
        />
        <Input
          label="Template Width"
          size="sm"
          type="number"
          min="1"
          max={10_000}
          value={width?.toString()}
          onValueChange={(v) => setWidth(parseInt(v))}
        />
        <div className="flex flex-row gap-1">
          <Input
            label="Template X"
            size="sm"
            type="number"
            value={x.toString()}
            onValueChange={(v) => setX(parseInt(v))}
          />
          <Input
            label="Template Y"
            size="sm"
            type="number"
            value={y.toString()}
            onValueChange={(v) => setY(parseInt(v))}
          />
        </div>
        <Slider
          label="Template Opacity"
          step={1}
          minValue={0}
          maxValue={100}
          value={opacity}
          onChange={(v) => setOpacity(v as number)}
          getValue={(v) => v + "%"}
        />
      </section>
    </>
  );
};
