import { Header } from "./Header";
import { AppContext } from "../contexts/AppContext";
import { CanvasWrapper } from "./CanvasWrapper";
import { Pallete } from "./Pallete";

const App = () => {
  return (
    <AppContext>
      <Header />
      <CanvasWrapper />
      <Pallete />
    </AppContext>
  );
};

export default App;
