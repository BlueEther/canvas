import { Header } from "./Header";
import { AppContext } from "../contexts/AppContext";
import { CanvasWrapper } from "./CanvasWrapper";
import { Pallete } from "./Pallete";
import { TemplateContext } from "../contexts/TemplateContext";
import { SettingsSidebar } from "./Settings/SettingsSidebar";
import { DebugModal } from "./Debug/DebugModal";

const App = () => {
  return (
    <AppContext>
      <TemplateContext>
        <Header />
        <CanvasWrapper />
        <Pallete />

        <DebugModal />
        <SettingsSidebar />
      </TemplateContext>
    </AppContext>
  );
};

export default App;
