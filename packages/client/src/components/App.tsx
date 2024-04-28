import { Header } from "./Header";
import { AppContext } from "../contexts/AppContext";
import { CanvasWrapper } from "./CanvasWrapper";
import { TemplateContext } from "../contexts/TemplateContext";
import { SettingsSidebar } from "./Settings/SettingsSidebar";
import { DebugModal } from "./Debug/DebugModal";
import { ToolbarWrapper } from "./Toolbar/ToolbarWrapper";

const App = () => {
  return (
    <AppContext>
      <TemplateContext>
        <Header />
        <CanvasWrapper />
        <ToolbarWrapper />

        <DebugModal />
        <SettingsSidebar />
      </TemplateContext>
    </AppContext>
  );
};

export default App;
