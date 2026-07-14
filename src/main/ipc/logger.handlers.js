import { shell } from "electron";
import fs from "fs";
import logger from "../utils/logger.js";
import { secureHandle } from "./secureHandle.js";

export const registerLoggerHandlers = () => {
  const ALLOWED_LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

  secureHandle("logger:log", async (_, { level, message, data }) => {
    try {
      const safeLevel = ALLOWED_LOG_LEVELS.has(level) ? level : "info";
      const logFn = logger[safeLevel];
      safeLevel === "error"
        ? logFn.call(logger, message, data?.error, data?.context)
        : logFn.call(logger, message, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("logger:getLogs", async (_, { lines = 100 }) => {
    try {
      return { success: true, logs: logger.getRecentLogs(lines) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("logger:getSystemInfo", async () => {
    try {
      return { success: true, systemInfo: logger.getSystemInfo() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("logger:exportBugReport", async (_, { description, userEmail }) => {
    try {
      if (typeof description !== "string" || description.length > 5000) {
        return { success: false, error: "Invalid description" };
      }
      if (typeof userEmail !== "string" || userEmail.length > 254) {
        return { success: false, error: "Invalid email" };
      }

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

  secureHandle("logger:openLogsFolder", async () => {
    try {
      await shell.openPath(logger.logsDir);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
