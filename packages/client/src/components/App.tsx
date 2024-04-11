import { Header } from "./Header";
import { AppContext } from "../contexts/AppContext";
import { CanvasWrapper } from "./CanvasWrapper";
import { Pallete } from "./Pallete";
import { TemplateContext } from "../contexts/TemplateContext";
import { SettingsSidebar } from "./Settings/SettingsSidebar";

const App = () => {
  return (
    <AppContext>
      <TemplateContext>
        <Header />
        <CanvasWrapper />
        <Pallete />

        <SettingsSidebar />
      </TemplateContext>
    </AppContext>
  );
};

export default App;
