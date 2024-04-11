import { Button } from "@nextui-org/react";
import { useAppContext } from "../contexts/AppContext";
import { User } from "./Header/User";

export const Header = () => {
  const { setSettingsSidebar } = useAppContext();

  return (
    <header id="main-header">
      <div></div>
      <div className="spacer"></div>
      <div className="box">
        <User />
        <Button onClick={() => setSettingsSidebar(true)}>Settings</Button>
      </div>
    </header>
  );
};
