import store from "../store.js";
import { clearPinnedCert } from "../app/certPinning.js";
import { secureHandle } from "./secureHandle.js";
import logger from "../utils/logger.js";

export const registerSecurityHandlers = () => {
  // Drop the pinned certificate for the configured server so the next
  // connection re-pins it (used after a legitimate certificate rotation).
  secureHandle("security:resetServerTrust", () => {
    const serverAddress = store.get("serverAddress", "");
    if (!serverAddress) return { success: false };
    try {
      const hostname = new URL(
        serverAddress.startsWith("http") ? serverAddress : `https://${serverAddress}`
      ).hostname;
      clearPinnedCert(hostname);
      logger.warn(`[Security] Certificate pin reset for ${hostname} by user`);
      return { success: true, hostname };
    } catch {
      return { success: false };
    }
  });
};
