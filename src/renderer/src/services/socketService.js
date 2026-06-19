import { io } from "socket.io-client";

let socket = null;

// getToken is an async function () => string — called on every connection attempt,
// including reconnections after expiry, so the socket always uses the freshest token.
export const connectSocket = (serverUrl, getToken) => {
  if (socket) {
    if (socket.connected) return socket;
    socket.disconnect();
  }
  socket = io(serverUrl, {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
    timeout: 5000,
    auth: (cb) => getToken().then(token => cb({ token })).catch(() => cb({ token: null })),
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;
