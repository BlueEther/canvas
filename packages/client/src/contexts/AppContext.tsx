import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthSession,
  ClientConfig,
  IAppContext,
  ICanvasPosition,
  IPosition,
} from "@sc07-canvas/lib/src/net";
import Network from "../lib/network";

const appContext = createContext<IAppContext>({} as any);

export const useAppContext = () => useContext(appContext);

export const AppContext = ({ children }: PropsWithChildren) => {
  const [config, setConfig] = useState<ClientConfig>(undefined as any);
  const [auth, setAuth] = useState<AuthSession>();
  const [canvasPosition, setCanvasPosition] = useState<ICanvasPosition>();
  const [cursorPosition, setCursorPosition] = useState<IPosition>();

  const [pixels, setPixels] = useState({ available: 0 });

  // overlays visible
  const [settingsSidebar, setSettingsSidebar] = useState(false);

  useEffect(() => {
    function handleConfig(config: ClientConfig) {
      console.info("Server sent config", config);
      setConfig(config);
    }

    function handleUser(user: AuthSession) {
      setAuth(user);
    }

    function handlePixels(pixels: { available: number }) {
      setPixels(pixels);
    }

    Network.on("user", handleUser);
    Network.on("config", handleConfig);
    Network.waitFor("pixels").then(([data]) => handlePixels(data));
    Network.on("pixels", handlePixels);

    Network.socket.connect();

    return () => {
      Network.off("user", handleUser);
      Network.off("config", handleConfig);
      Network.off("pixels", handlePixels);
    };
  }, []);

  return (
    <appContext.Provider
      value={{
        config,
        user: auth,
        canvasPosition,
        setCanvasPosition,
        cursorPosition,
        setCursorPosition,
        pixels,
        settingsSidebar,
        setSettingsSidebar,
      }}
    >
      {config ? children : "Loading..."}
    </appContext.Provider>
  );
};
