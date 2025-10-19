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
  gameStats: {
    type: "object",
    default: {},
  },
  installedGamesCache: {
    type: "array",
    default: [],
  },
};

const store = new Store({ schema });

export default store;

//  encryptionKey: ""
