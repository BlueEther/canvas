import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { AuthSession, ClientConfig, IPosition } from "@sc07-canvas/lib/src/net";
import Network from "../lib/network";
import { Spinner } from "@nextui-org/react";
import { api } from "../lib/utils";

interface IAppContext {
  config?: ClientConfig;
  user?: AuthSession;
  canvasPosition?: ICanvasPosition;
  setCanvasPosition: (v: ICanvasPosition) => void;
  cursorPosition?: IPosition;
  setCursorPosition: (v?: IPosition) => void;
  pixels: { available: number };
  undo?: { available: true; expireAt: number };
  loadChat: boolean;
  setLoadChat: (v: boolean) => void;
  connected: boolean;

  settingsSidebar: boolean;
  setSettingsSidebar: (v: boolean) => void;
  pixelWhois?: { x: number; y: number; surrounding: string[][] };
  setPixelWhois: (v: this["pixelWhois"]) => void;
  showKeybinds: boolean;
  setShowKeybinds: (v: boolean) => void;

  virginOverlay: IMapOverlay;
  setVirginOverlay: React.Dispatch<React.SetStateAction<IMapOverlay>>;
  heatmapOverlay: IMapOverlay;
  setHeatmapOverlay: React.Dispatch<React.SetStateAction<IMapOverlay>>;

  hasAdmin: boolean;
}

interface ICanvasPosition {
  x: number;
  y: number;
  zoom: number;
}

interface IMapOverlay {
  enabled: boolean;

  /**
   * opacity of the overlay
   * 0.0 - 1.0
   */
  opacity: number;

  loading: boolean;
}

const appContext = createContext<IAppContext>({} as any);

export const useAppContext = () => useContext(appContext);

export const AppContext = ({ children }: PropsWithChildren) => {
  const [config, setConfig] = useState<ClientConfig>(undefined as any);
  const [auth, setAuth] = useState<AuthSession>();
  const [canvasPosition, setCanvasPosition] = useState<ICanvasPosition>();
  const [cursorPosition, setCursorPosition] = useState<IPosition>();
  const [connected, setConnected] = useState(false);

  // --- settings ---
  const [loadChat, _setLoadChat] = useState(false);

  const [pixels, setPixels] = useState({ available: 0 });
  const [undo, setUndo] = useState<{ available: true; expireAt: number }>();

  // overlays visible
  const [settingsSidebar, setSettingsSidebar] = useState(false);
  const [pixelWhois, setPixelWhois] = useState<{
    x: number;
    y: number;
    surrounding: string[][];
  }>();
  const [showKeybinds, setShowKeybinds] = useState(false);

  const [virginOverlay, setVirginOverlay] = useState<IMapOverlay>({
    enabled: false,
    opacity: 1,
    loading: false,
  });
  const [heatmapOverlay, setHeatmapOverlay] = useState<IMapOverlay>({
    enabled: false,
    opacity: 1,
    loading: false,
  });

  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    function loadSettings() {
      setLoadChat(
        localStorage.getItem("matrix.enable") === null
          ? true
          : localStorage.getItem("matrix.enable") === "true"
      );
    }

    function handleConfig(config: ClientConfig) {
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

    function handleConnect() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    api<{}>("/api/admin/check").then(({ status, data }) => {
      if (status === 200) {
        if (data.success) {
          setHasAdmin(true);
        }
      }
    });

    Network.on("user", handleUser);
    Network.on("config", handleConfig);
    Network.waitFor("pixels").then(([data]) => handlePixels(data));
    Network.on("pixels", handlePixels);
    Network.on("undo", handleUndo);

    Network.on("connected", handleConnect);
    Network.on("disconnected", handleDisconnect);

    Network.socket.connect();

    loadSettings();

    return () => {
      Network.off("user", handleUser);
      Network.off("config", handleConfig);
      Network.off("pixels", handlePixels);
      Network.off("undo", handleUndo);
      Network.off("connected", handleConnect);
      Network.off("disconnected", handleDisconnect);
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
        connected,
        hasAdmin,
        pixelWhois,
        setPixelWhois,
        showKeybinds,
        setShowKeybinds,
        virginOverlay,
        setVirginOverlay,
        heatmapOverlay,
        setHeatmapOverlay,
      }}
    >
      {!config && (
        <div className="fixed top-0 left-0 w-full h-full z-[9999] backdrop-blur-sm bg-black/30 text-white flex items-center justify-center">
          <Spinner label="Loading..." />
        </div>
      )}
      {children}
    </appContext.Provider>
  );
};
