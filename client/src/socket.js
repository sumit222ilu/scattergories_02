import { io } from "socket.io-client";

// ✅ Safe ID generator
function generateId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ✅ session-based identity (refresh safe, close resets)
const playerId = sessionStorage.getItem("playerId") || generateId();

sessionStorage.setItem("playerId", playerId);

export const socket = io(`http://${window.location.hostname}:3000`, {
  auth: { playerId },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
