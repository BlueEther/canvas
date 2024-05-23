import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  const checkInterval = useRef<ReturnType<typeof setInterval>>();
  const checkNotifs = useRef<ReturnType<typeof setInterval>>();

  const [user, setUser] = useState<IMatrixUser>();
  const [notifs, setNotifs] = useState(0);

  const doLogin = () => {
    const redirectUrl =
      window.location.protocol + "//" + window.location.host + "/chat_callback";

    window.addEventListener("focus", handleWindowFocus);
    checkInterval.current = setInterval(checkForAccessToken, 500);

    window.open(
      `https://${import.meta.env.VITE_MATRIX_HOST}/_matrix/client/v3/login/sso/redirect?redirectUrl=${encodeURIComponent(redirectUrl)}`,
      "_blank"
    );
  };

  const doLogout = async () => {
    await fetch(
      `https://${import.meta.env.VITE_MATRIX_HOST}/_matrix/client/v3/logout`,
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
  }, []);

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
  };

  const checkForNotifs = async () => {
    const accessToken = localStorage.getItem("matrix.access_token");
    if (!accessToken) return;

    const notifReq = await fetch(
      `https://${import.meta.env.VITE_MATRIX_HOST}/_matrix/client/v3/notifications?limit=10`,
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
