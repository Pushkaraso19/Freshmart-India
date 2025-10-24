import { io } from 'socket.io-client';

let socket;

export function connectAdminSocket(token) {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
  // Reuse existing socket when possible
  if (socket && socket.connected) return socket;

  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    auth: token ? { token } : undefined,
  });
  return socket;
}

export function getSocket() {
  return socket;
}
