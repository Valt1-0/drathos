import Store from "electron-store";

const schema = {
  userToken: {
    type: "string",
  },
  serverAddress: {
    type: "string",
  },
  downloadPath: {
    type: "string",
  },
  installedGamesCache: {
    type: "object",
    default: {},
  },
};

// 🔐 Encryption key depuis les variables d'environnement
// Génère une clé par défaut en dev, utilise DRATHOS_ENCRYPTION_KEY en prod
const encryptionKey = process.env.DRATHOS_ENCRYPTION_KEY ||
  'drathos-dev-key-change-in-production';

const store = new Store({
  schema,
  encryptionKey: encryptionKey,
});

export default store;
