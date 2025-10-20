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

const store = new Store({ schema });

export default store;

//  encryptionKey: ""
