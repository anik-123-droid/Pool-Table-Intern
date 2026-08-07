import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '').replace(/\/$/, '')
      : 'http://localhost:5000';

    socket = io(URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔥 Socket disconnected from server');
    });
  }
  return socket;
};
