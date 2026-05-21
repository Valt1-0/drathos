import { Notification } from "electron";
import { secureHandle } from "./secureHandle.js";

export const registerNotificationHandlers = () => {
  secureHandle("notification:show", (_, { title, body }) => {
    if (!Notification.isSupported()) return { success: false };
    new Notification({ title, body }).show();
    return { success: true };
  });
};
