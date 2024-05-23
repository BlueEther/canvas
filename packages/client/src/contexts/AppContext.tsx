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

  // --- settings ---
  const [loadChat, _setLoadChat] = useState(false);

  const [pixels, setPixels] = useState({ available: 0 });
  const [undo, setUndo] = useState<{ available: true; expireAt: number }>();

  // overlays visible
  const [settingsSidebar, setSettingsSidebar] = useState(false);

  useEffect(() => {
    function loadSettings() {
      setLoadChat(
        localStorage.getItem("matrix.enable") === null
          ? true
          : localStorage.getItem("matrix.enable") === "true"
      );
    }

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

    function handleUndo(
      data: { available: false } | { available: true; expireAt: number }
    ) {
      if (data.available) {
        setUndo({ available: true, expireAt: data.expireAt });
      } else {
        setUndo(undefined);
      }
    }

    Network.on("user", handleUser);
    Network.on("config", handleConfig);
    Network.waitFor("pixels").then(([data]) => handlePixels(data));
    Network.on("pixels", handlePixels);
    Network.on("undo", handleUndo);

    Network.socket.connect();

    loadSettings();

    return () => {
      Network.off("user", handleUser);
      Network.off("config", handleConfig);
      Network.off("pixels", handlePixels);
    };
  }, []);

  const setLoadChat = (v: boolean) => {
    _setLoadChat(v);
    localStorage.setItem("matrix.enable", v ? "true" : "false");
  };

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
        undo,
        loadChat,
        setLoadChat,
      }}
    >
      {config ? children : "Loading..."}
    </appContext.Provider>
  );
};
