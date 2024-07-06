/**
 * Handle alerts sent by the server (moderation or internal)
 */

import { IAlert, IAlertKeyedMessages } from "@sc07-canvas/lib/src/net";
import EventEmitter from "eventemitter3";
import { toast } from "react-toastify";

/**
 * Handles IAlert outside of react
 * @param alert
 */
export const handleAlert = (alert: IAlert) => {
  switch (alert.is) {
    case "toast":
      handleToast(alert);
      break;
    case "modal":
      handleModal(alert);
      break;
  }
};

export const handleDismiss = (id: string) => {
  toast.dismiss(id);
};

export interface IDynamicModal {
  title: string | JSX.Element;
  body: string | JSX.Element;
}

/**
 * Dynamic modal event root
 *
 * These are consumed by src/DynamicModals.tsx
 */
interface IDynamicModalEvents {
  showModal: (modal: IDynamicModal) => void;
}
class DynamicModalClass extends EventEmitter<IDynamicModalEvents> {}
export const DynamicModal = new DynamicModalClass();

const getMessage = <T extends keyof IAlertKeyedMessages>(
  key: T,
  metadata: IAlertKeyedMessages[T]
): { title: string | JSX.Element; body: string | JSX.Element } => {
  switch (key) {
    case "banned": {
      let metadata_ = metadata as IAlertKeyedMessages["banned"];
      const until = new Date(metadata_.until);

      return {
        title: "You have been banned.",
        body:
          "You will be unbanned in " +
          ((until.getTime() - Date.now()) / 1000).toFixed(0) +
          " seconds",
      };
    }
    case "unbanned": {
      return {
        title: "You have been unbanned.",
        body: "",
      };
    }
    default:
      return {
        title: "Unknown Message?",
        body: "Unknown message: " + key,
      };
  }
};

const handleToast = (alert: IAlert<"toast">) => {
  let Body: JSX.Element;

  if ("title" in alert) {
    Body = (
      <>
        <b>{alert.title}</b>
        {alert.body && <> {alert.body}</>}
      </>
    );
  } else {
    const message = getMessage(alert.message_key, alert.metadata);

    Body = (
      <>
        <b>{message.title}</b>
        {message.body}
      </>
    );
  }

  toast(Body, {
    toastId: alert.id,
    type: alert.severity,
    autoClose: alert.autoDismiss ? 5000 : false,
  });
};

const handleModal = (alert: IAlert<"modal">) => {
  let modal: IDynamicModal;

  if ("title" in alert) {
    modal = {
      title: alert.title,
      body: alert.body || "",
    };
  } else {
    const message = getMessage(alert.message_key, alert.metadata);

    modal = {
      title: message.title,
      body: message.body,
    };
  }

  DynamicModal.emit("showModal", modal);
};
