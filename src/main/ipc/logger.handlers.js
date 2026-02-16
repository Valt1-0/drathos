/**
 * Logger and bug reporting IPC handlers
 */
import { ipcMain, shell } from "electron";
import fs from "fs";
import logger from "../utils/logger.js";
import crashReporter from "../utils/crashReporter.js";

export const registerLoggerHandlers = () => {
  ipcMain.handle("logger:log", async (_, { level, message, data }) => {
    try {
      const logFn = logger[level] || logger.info;
      level === "error" ? logFn.call(logger, message, data?.error, data?.context) : logFn.call(logger, message, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("logger:getLogs", async (_, { lines = 100 }) => {
    try {
      return { success: true, logs: logger.getRecentLogs(lines) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("logger:getSystemInfo", async () => {
    try {
      return { success: true, systemInfo: logger.getSystemInfo() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("logger:exportBugReport", async (_, { description, userEmail }) => {
    try {
      const reportPath = await logger.exportBugReport();
      if (!reportPath) return { success: false, error: "Failed to create report" };

      const report = JSON.parse(await fs.promises.readFile(reportPath, "utf8"));
      report.userDescription = description;
      report.userEmail = userEmail;
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

      return { success: true, reportPath, message: "Bug report created" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("logger:openLogsFolder", async () => {
    try {
      await shell.openPath(logger.logsDir);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("crashReport:send", async (_, { error, componentStack, context, description }) => {
    try {
      if (description) {
        await crashReporter.reportManual({ description, error, context });
      } else {
        await crashReporter.reportRendererError({ error, componentStack, context });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
};
