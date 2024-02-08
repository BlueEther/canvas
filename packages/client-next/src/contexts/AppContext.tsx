import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Socket } from "socket.io-client";
import { ClientConfig, IAppContext, IPalleteContext } from "../types";
import { AuthSession } from "@sc07-canvas/lib/src/net";
import { number } from "prop-types";
import Network from "../lib/network";

const appContext = createContext<IAppContext>({} as any);

export const useAppContext = () => useContext(appContext);

export const AppContext = ({ children }: PropsWithChildren) => {
  const [config, setConfig] = useState<ClientConfig>(undefined as any);
  const [auth, setAuth] = useState<AuthSession>();

  useEffect(() => {
    function handleConfig(config: ClientConfig) {
      console.info("Server sent config", config);
      setConfig(config);
    }

    function handleUser(user: AuthSession) {
      setAuth(user);
    }

    Network.on("user", handleUser);
    Network.on("config", handleConfig);

    Network.socket.connect();

    return () => {
      Network.off("user", handleUser);
      Network.off("config", handleConfig);
    };
  }, []);

  return (
    <appContext.Provider value={{ config, user: auth }}>
      {config ? children : "Loading..."}
    </appContext.Provider>
  );
};
