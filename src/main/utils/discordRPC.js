import net from "net";
import { EventEmitter } from "events";

/**
 * Opcodes Discord RPC
 */
const OPCodes = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
};

/**
 * Implémentation native du Discord Rich Presence (sans lib externe)
 * Utilise les sockets IPC natifs de Node.js pour communiquer avec Discord
 */
export class DiscordRPCService extends EventEmitter {
  constructor() {
    super();
    this.clientId = "1429998620282720340";
    this.socket = null;
    this.isConnected = false;
    this.isEnabled = false;
    this.currentActivity = null;
    this.savedActivity = null;
    this.connectionRetryTimeout = null;
    this.maxRetries = Infinity;
    this.retryCount = 0;
    this.user = null;
  }

  /**
   * Obtient le chemin du pipe IPC Discord selon la plateforme
   */
  getIPCPath(id = 0) {
    if (process.platform === "win32") {
      return `\\\\?\\pipe\\discord-ipc-${id}`;
    }

    const { env } = process;
    const prefix = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || "/tmp";
    return `${prefix.replace(/\/$/, "")}/discord-ipc-${id}`;
  }

  /**
   * Encode un message Discord RPC
   */
  encode(op, data) {
    const dataStr = JSON.stringify(data);
    const dataBuffer = Buffer.from(dataStr, "utf8");
    const packet = Buffer.alloc(8 + dataBuffer.length);

    // Opcode (uint32 LE)
    packet.writeUInt32LE(op, 0);
    // Length (uint32 LE)
    packet.writeUInt32LE(dataBuffer.length, 4);
    // Data
    dataBuffer.copy(packet, 8);

    return packet;
  }

  /**
   * Décode un message Discord RPC
   */
  decode(buffer) {
    if (buffer.length < 8) {
      return null;
    }

    const op = buffer.readUInt32LE(0);
    const length = buffer.readUInt32LE(4);
    const data = buffer.slice(8, 8 + length);

    return {
      op,
      data: JSON.parse(data.toString("utf8")),
    };
  }

  /**
   * Initialise le service Discord RPC
   */
  async initialize(enabled = true) {
    this.isEnabled = enabled;

    if (!enabled) {
      return { success: true, disabled: true };
    }

    try {
      await this.connect();
      return { success: true, connected: this.isConnected };
    } catch (error) {
      console.error("[DiscordRPC] Erreur d'initialisation:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Connexion au client Discord via IPC
   */
  async connect(attempt = 0) {
    if (this.isConnected) {
      return true;
    }

    if (!this.isEnabled) {
      return false;
    }

    if (attempt >= 10) {
      throw new Error("Discord n'est pas lancé ou inaccessible");
    }

    const ipcPath = this.getIPCPath(attempt);

    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(ipcPath, () => {
        this.isConnected = true;

        const handshake = this.encode(OPCodes.HANDSHAKE, {
          v: 1,
          client_id: this.clientId,
        });

        this.socket.write(handshake);
      });

      this.socket.on("data", (data) => {
        try {
          const message = this.decode(data);
          if (!message) return;

          if (message.op === OPCodes.FRAME) {
            if (message.data.evt === "READY") {
              this.user = message.data.data.user;
              console.log(`[DiscordRPC] Connecté (${this.user.username}#${this.user.discriminator})`);
              this.retryCount = 0;
              this.emit("ready", this.user);

              setTimeout(() => {
                if (this.savedActivity) {
                  this.restoreSavedActivity();
                } else {
                  this.setIdleActivity();
                }
              }, 1000);

              resolve(true);
            }
          } else if (message.op === OPCodes.CLOSE) {
            this.handleDisconnect();
          } else if (message.op === OPCodes.PING) {
            this.socket.write(this.encode(OPCodes.PONG, {}));
          }
        } catch (error) {
          console.error("[DiscordRPC] Erreur:", error.message);
        }
      });

      this.socket.on("error", (error) => {
        if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
          if (this.socket) {
            this.socket.destroy();
          }
          this.connect(attempt + 1).then(resolve).catch(reject);
        } else {
          console.error("[DiscordRPC] Erreur:", error.message);
          reject(error);
        }
      });

      this.socket.on("close", () => {
        this.handleDisconnect();
      });
    });
  }

  handleDisconnect() {
    if (this.isConnected) {
      console.log("[DiscordRPC] Déconnecté");
      if (this.currentActivity) {
        this.savedActivity = { ...this.currentActivity };
      }
    }

    this.isConnected = false;
    this.currentActivity = null;

    if (this.socket) {
      this.socket = null;
    }

    this.emit("disconnected");

    if (this.isEnabled) {
      this.retryCount++;

      const retryDelay = this.retryCount === 1 ? 15000 :
                        this.retryCount === 2 ? 30000 : 60000;

      if (this.retryCount === 1) {
        console.log("[DiscordRPC] Recherche de Discord...");
      } else if (this.retryCount === 2) {
        console.log(`[DiscordRPC] Reconnexion automatique (${retryDelay / 1000}s)`);
      }

      this.connectionRetryTimeout = setTimeout(() => {
        this.connect()
          .then(() => {
            console.log("[DiscordRPC] Reconnecté");
          })
          .catch(() => {});
      }, retryDelay);
    }
  }

  sendCommand(cmd, args = {}) {
    if (!this.isConnected || !this.socket) {
      return;
    }

    const payload = this.encode(OPCodes.FRAME, {
      cmd,
      args,
      nonce: this.generateNonce(),
    });

    this.socket.write(payload);
  }

  /**
   * Génère un nonce unique
   */
  generateNonce() {
    return Date.now().toString() + Math.random().toString(36).substring(2);
  }

  async setIdleActivity() {
    if (!this.isConnected) return;

    try {
      const activityData = {
        details: "En navigation",
        state: "Recherche de jeux",
        assets: {
          large_image: "drathos_logo",
          large_text: "Drathos - Game Library",
        },
        instance: false,
      };

      this.sendCommand("SET_ACTIVITY", {
        pid: process.pid,
        activity: activityData,
      });

      this.currentActivity = { type: "idle" };
      this.savedActivity = { type: "idle", activity: activityData };
    } catch (error) {
      console.error("[DiscordRPC] Erreur:", error.message);
    }
  }

  async setGameActivity(gameData) {
    if (!this.isConnected || !this.isEnabled) {
      this.savedActivity = { type: "game", gameData };
      return;
    }

    try {
      const { gameId, gameName, startTime, usesWine } = gameData;

      const activity = {
        details: `Joue à ${gameName}`,
        state: usesWine ? "via Wine" : "En jeu",
        timestamps: {
          start: startTime ? Math.floor(startTime / 1000) : undefined,
        },
        assets: {
          large_image: "drathos_logo",
          large_text: gameName,
        },
        instance: false,
      };

      if (usesWine) {
        activity.assets.small_image = "wine_logo";
        activity.assets.small_text = "Wine Compatibility Layer";
      }

      this.sendCommand("SET_ACTIVITY", {
        pid: process.pid,
        activity,
      });

      this.currentActivity = { type: "game", gameId, gameName };
      this.savedActivity = { type: "game", gameData, activity };
    } catch (error) {
      console.error("[DiscordRPC] Erreur:", error.message);
    }
  }

  async restoreSavedActivity() {
    if (!this.savedActivity) {
      return;
    }

    try {
      if (this.savedActivity.type === "idle") {
        await this.setIdleActivity();
      } else if (this.savedActivity.type === "game") {
        console.log(`[DiscordRPC] Activité restaurée: ${this.savedActivity.gameData?.gameName}`);
        await this.setGameActivity(this.savedActivity.gameData);
      }
    } catch (error) {
      console.error("[DiscordRPC] Erreur:", error.message);
    }
  }

  async clearActivity() {
    if (!this.isConnected) return;

    try {
      this.sendCommand("SET_ACTIVITY", {
        pid: process.pid,
        activity: null,
      });

      this.currentActivity = null;
      this.savedActivity = null;
    } catch (error) {
      console.error("[DiscordRPC] Erreur:", error.message);
    }
  }

  async setEnabled(enabled) {
    this.isEnabled = enabled;

    if (enabled && !this.isConnected) {
      await this.connect();
    } else if (!enabled && this.isConnected) {
      await this.disconnect();
    }

    return { success: true, enabled: this.isEnabled, connected: this.isConnected };
  }

  async disconnect() {
    if (this.connectionRetryTimeout) {
      clearTimeout(this.connectionRetryTimeout);
      this.connectionRetryTimeout = null;
    }

    if (!this.socket) {
      this.isConnected = false;
      return;
    }

    try {
      await this.clearActivity();
      this.socket.end();
    } catch (error) {
      console.error("[DiscordRPC] Erreur:", error.message);
    } finally {
      this.socket = null;
      this.isConnected = false;
      this.currentActivity = null;
    }
  }

  /**
   * Obtient le statut actuel du service
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isEnabled: this.isEnabled,
      currentActivity: this.currentActivity,
      clientId: this.clientId,
      user: this.user,
    };
  }
}

// Export d'une instance unique (singleton)
export const discordRPC = new DiscordRPCService();
