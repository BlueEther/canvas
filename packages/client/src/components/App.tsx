import { Header } from "./Header";
import { AppContext, useAppContext } from "../contexts/AppContext";
import { CanvasWrapper } from "./CanvasWrapper";
import { TemplateContext } from "../contexts/TemplateContext";
import { SettingsSidebar } from "./Settings/SettingsSidebar";
import { DebugModal } from "./Debug/DebugModal";
import { ToolbarWrapper } from "./Toolbar/ToolbarWrapper";
import React, { lazy, useEffect } from "react";
import { ChatContext } from "../contexts/ChatContext";

import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { AuthErrors } from "./AuthErrors";
import "../lib/keybinds";
import { PixelWhoisSidebar } from "./PixelWhoisSidebar";
import { KeybindModal } from "./KeybindModal";

const Chat = lazy(() => import("./Chat/Chat"));

console.log("Client init with version " + __COMMIT_HASH__);

const DynamicallyLoadChat = () => {
  const { loadChat } = useAppContext();

  return <React.Suspense>{loadChat && <Chat />}</React.Suspense>;
};

// get access to context data
const AppInner = () => {
  return (
    <>
      <Header />
      <CanvasWrapper />
      <ToolbarWrapper />

      {/* <DynamicallyLoadChat /> */}

      <DebugModal />
      <SettingsSidebar />
      <PixelWhoisSidebar />
      <KeybindModal />
      <AuthErrors />

      <ToastContainer position="top-left" />
    </>
  );
};

const App = () => {
  useEffect(() => {
    // detect auth callback for chat, regardless of it being loaded
    // callback token expires quickly, so we should exchange it as quick as possible
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("loginToken")) {
        // login button opens a new tab that redirects here
        // if we're that tab, we should try to close this tab when we're done
        // should work because this tab is opened by JS
        const shouldCloseWindow =
          window.location.pathname.startsWith("/chat_callback");

        // token provided by matrix's /sso/redirect
        const token = params.get("loginToken")!;

        // immediately remove from url to prevent reloading
        window.history.replaceState({}, "", "/");

        const loginReq = await fetch(
          `https://${import.meta.env.VITE_MATRIX_HOST}/_matrix/client/v3/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "m.login.token",
              token,
            }),
          }
        );

        const loginRes = await loginReq.json();

        console.log("[Chat] Matrix login", loginReq.status);

        switch (loginReq.status) {
          case 200: {
            // success
            console.log("[Chat] Logged in successfully", loginRes);

            localStorage.setItem(
              "matrix.access_token",
              loginRes.access_token + ""
            );
            localStorage.setItem("matrix.device_id", loginRes.device_id + "");
            localStorage.setItem("matrix.user_id", loginRes.user_id + "");

            if (shouldCloseWindow) {
              console.log(
                "[Chat] Path matches autoclose, attempting to close window..."
              );
              window.close();
              alert("You can close this window and return to the other tab :)");
            } else {
              console.log(
                "[Chat] Path doesn't match autoclose, not doing anything"
              );
            }
            break;
          }
          case 400:
          case 403:
            console.log("[Chat] Matrix login", loginRes);
            alert(
              "[Chat] Failed to login\n" +
                loginRes.errcode +
                " " +
                loginRes.error
            );
            break;
          case 429:
            alert(
              "[Chat] Failed to login, ratelimited.\nTry again in " +
                Math.floor(loginRes.retry_after_ms / 1000) +
                "s\n" +
                loginRes.errcode +
                " " +
                loginRes.error
            );
            break;
          default:
            alert(
              "Error " +
                loginReq.status +
                " returned when trying to login to chat"
            );
        }
      }
    })();
  }, []);

  return (
    <AppContext>
      <ChatContext>
        <TemplateContext>
          <AppInner />
        </TemplateContext>
      </ChatContext>
    </AppContext>
  );
};

export default App;
