import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket = null;

export function getSocket(token) {
  if (!socket) {
    socket = io(API_BASE_URL, {
      auth: { token: token || localStorage.getItem('civibridge_token') },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket(token);
  if (!s.connected) {
    if (token) s.auth = { token };
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
}

export function onGrievanceCreated(callback) {
  const s = getSocket();
  s.on('grievance:created', callback);
  return () => s.off('grievance:created', callback);
}

export function onGrievanceUpdated(callback) {
  const s = getSocket();
  s.on('grievance:updated', callback);
  return () => s.off('grievance:updated', callback);
}
