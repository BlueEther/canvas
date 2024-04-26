import { Button } from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";
import { User } from "./Header/User";
import { Debug } from "@sc07-canvas/lib/src/debug";

export const Header = () => {
  const { setSettingsSidebar } = useAppContext();

  return (
    <header id="main-header">
      <div></div>
      <div className="spacer"></div>
      <div className="box">
        <User />
        <Button onClick={() => setSettingsSidebar(true)}>Settings</Button>
        <Button onClick={() => Debug.openDebugTools()}>debug</Button>
      </div>
    </header>
  );
};
