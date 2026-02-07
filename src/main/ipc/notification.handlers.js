import { ipcMain, Notification } from "electron";

export const registerNotificationHandlers = () => {
  ipcMain.handle("notification:show", (_, { title, body }) => {
    if (!Notification.isSupported()) return { success: false };
    new Notification({ title, body }).show();
    return { success: true };
  });
};
