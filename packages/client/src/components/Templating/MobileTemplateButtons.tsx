import { Switch } from "@nextui-org/react";
import { useTemplateContext } from "../../contexts/TemplateContext";

export const MobileTemplateButtons = () => {
  const { enable, setEnable, url } = useTemplateContext();

  return (
    <div className="md:hidden toolbar-box top-[-10px] right-[10px]">
      {url && (
        <div className="md:hidden rounded-xl bg-gray-300 p-2">
          <Switch isSelected={enable} onValueChange={setEnable}>
            Template
          </Switch>
        </div>
      )}
    </div>
  );
};
