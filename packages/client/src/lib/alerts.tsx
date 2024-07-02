/**
 * Handle alerts sent by the server (moderation or internal)
 */

import { IAlert } from "@sc07-canvas/lib/src/net";
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

const handleToast = (alert: IAlert<"toast">) => {
  const Body = (
    <>
      <b>{alert.title}</b>
      {alert.body && <> {alert.body}</>}
    </>
  );

  toast(Body, {
    toastId: alert.id,
    type: alert.severity,
    autoClose: alert.autoDismiss ? 5000 : false,
  });
};

const handleModal = (alert: IAlert<"modal">) => {
  window.alert("alerts#handleModal triggered, but no implementation exists");
};
