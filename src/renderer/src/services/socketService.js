import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (serverUrl) => {
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
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
