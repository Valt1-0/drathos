import Store from "electron-store";

const schema = {
  userToken: {
    type: "string",
  },
  serverAddress: {
    type: "string",
  },
};

const store = new Store({ schema, encryptionKey: "DR4TH0S" });

export default store;