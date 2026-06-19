import { Notification } from "electron";
import { secureHandle } from "./secureHandle.js";

const MAX_TITLE_LEN = 100;
const MAX_BODY_LEN = 500;

export const registerNotificationHandlers = () => {
  secureHandle("notification:show", (_, { title, body }) => {
    if (!Notification.isSupported()) return { success: false };
    if (typeof title !== "string" || typeof body !== "string") return { success: false };
    new Notification({
      title: title.slice(0, MAX_TITLE_LEN),
      body: body.slice(0, MAX_BODY_LEN),
    }).show();
    return { success: true };
  });
};
