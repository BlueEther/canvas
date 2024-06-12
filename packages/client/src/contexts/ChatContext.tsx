import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppContext } from "./AppContext";
import { toast } from "react-toastify";

interface IMatrixUser {
  userId: string;
}

export interface IChatContext {
  user?: IMatrixUser;
  notificationCount: number;

  doLogin: () => void;
  doLogout: () => Promise<void>;
}

const chatContext = createContext<IChatContext>({} as any);

export const useChatContext = () => useContext(chatContext);

export const ChatContext = ({ children }: PropsWithChildren) => {
  const { config } = useAppContext();
  const checkInterval = useRef<ReturnType<typeof setInterval>>();
  const checkNotifs = useRef<ReturnType<typeof setInterval>>();

  const [user, setUser] = useState<IMatrixUser>();
  const [notifs, setNotifs] = useState(0);

  const doLogin = () => {
    if (!config) {
      console.warn("[ChatContext#doLogin] has no config instance");
      return;
    }

    if (user?.userId) {
      console.log("[ChatContext#doLogin] user logged in, opening element...");
      window.open(config.chat.element_host);
      return;
    }

    const redirectUrl =
      window.location.protocol + "//" + window.location.host + "/chat_callback";

    window.addEventListener("focus", handleWindowFocus);
    checkInterval.current = setInterval(checkForAccessToken, 500);

    window.open(
      `https://${config.chat.matrix_homeserver}/_matrix/client/v3/login/sso/redirect?redirectUrl=${encodeURIComponent(redirectUrl)}`,
      "_blank"
    );
  };

  const doLogout = async () => {
    if (!config) {
      console.warn("[ChatContext#doLogout] has no config instance");
      return;
    }

    await fetch(
      `https://${config.chat.matrix_homeserver}/_matrix/client/v3/logout`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer " + localStorage.getItem("matrix.access_token"),
        },
      }
    );

    localStorage.removeItem("matrix.access_token");
    localStorage.removeItem("matrix.device_id");
    localStorage.removeItem("matrix.user_id");
    setUser(undefined);
  };

  useEffect(() => {
    checkForAccessToken();
    checkNotifs.current = setInterval(checkForNotifs, 1000);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      if (checkInterval.current) clearInterval(checkInterval.current);
      if (checkNotifs.current) clearInterval(checkNotifs.current);
    };
  }, [config?.chat]);

  const handleWindowFocus = () => {
    console.log("[Chat] Window has gained focus");

    checkForAccessToken();
  };

  const checkForAccessToken = () => {
    const accessToken = localStorage.getItem("matrix.access_token");
    const deviceId = localStorage.getItem("matrix.device_id");
    const userId = localStorage.getItem("matrix.user_id");

    if (!accessToken || !deviceId || !userId) return;

    // access token acquired

    window.removeEventListener("focus", handleWindowFocus);
    if (checkInterval.current) clearInterval(checkInterval.current);

    console.log("[Chat] access token has been acquired");
    setUser({ userId });

    toast.success("Logged into chat");
    checkIfInGeneral();
  };

  const checkIfInGeneral = async () => {
    const generalAlias = config?.chat.general_alias;
    if (!generalAlias) {
      console.log("[ChatContext#checkIfInGeneral] no general alias in config");
      return;
    }

    const accessToken = localStorage.getItem("matrix.access_token");
    if (!accessToken) return;

    const joinReq = await fetch(
      `https://${config.chat.matrix_homeserver}/_matrix/client/v3/join/${generalAlias}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Auto-joined via Canvas client",
        }),
      }
    );
    const joinRes = await joinReq.json();
    console.log(
      "[ChatContext#checkIfInGeneral] auto-join general response",
      joinRes
    );

    if (joinReq.status === 200) {
      toast.success(`Joined chat ${decodeURIComponent(generalAlias)}!`);
    } else if (joinReq.status === 403) {
      toast.error(
        "Failed to join general chat! " +
          joinRes.errcode +
          " - " +
          joinRes.error
      );
    } else if (joinReq.status === 429) {
      toast.warn("Auto-join general chat got ratelimited");
    } else {
      toast.error(
        "Failed to join general chat! " +
          joinRes.errcode +
          " - " +
          joinRes.error
      );
    }
  };

  const checkForNotifs = async () => {
    if (!config) {
      console.warn("[ChatContext#checkForNotifs] no config instance");
      return;
    }

    const accessToken = localStorage.getItem("matrix.access_token");
    if (!accessToken) return;

    const notifReq = await fetch(
      `https://${config.chat.matrix_homeserver}/_matrix/client/v3/notifications?limit=10`,
      {
        headers: {
          Authorization: "Bearer " + accessToken,
        },
      }
    );

    const notifRes = await notifReq.json();

    const notificationCount =
      notifRes?.notifications?.filter((n: any) => !n.read).length || 0;
    setNotifs(notificationCount);
  };

  return (
    <chatContext.Provider
      value={{ user, notificationCount: notifs, doLogin, doLogout }}
    >
      {children}
    </chatContext.Provider>
  );
};
