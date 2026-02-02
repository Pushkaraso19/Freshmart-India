import { io } from 'socket.io-client';
import { API_BASE_URL } from '../lib/api';

let socket;

export function connectAdminSocket(token) {
  const url = API_BASE_URL || window.location.origin;
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
