import Store from 'electron-store'

const schema = {
  userToken: {
    type: 'string',
  },
  serverAddress: {
    type: 'string',
  },
  downloadPath: {
    type: 'string',
  },
};

const store = new Store({ schema, });

export default store;

//  encryptionKey: "DR4TH0S"