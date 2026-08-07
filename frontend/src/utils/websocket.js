import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// Polyfill global for Vite compatibility with older stompjs
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}

let stompClient = null;

export const connectWebSocket = (onTableUpdate) => {
  try {
    const wsUrl = import.meta.env.PROD ? `${window.location.origin}/api/ws` : 'http://localhost:8080/ws';
    const socket = new SockJS(wsUrl);
    stompClient = Stomp.over(socket);
    
    // Disable logging to keep console clean
    stompClient.debug = null;

    stompClient.connect({}, () => {
      // Subscribe to real-time table status updates
      stompClient.subscribe('/topic/tables', (message) => {
        if (message.body) {
          try {
            const updatedTables = JSON.parse(message.body);
            onTableUpdate(updatedTables);
          } catch (e) {
            console.error('Failed to parse websocket table update payload', e);
          }
        }
      });
    }, (error) => {
      console.warn('STOMP connection error, retrying in 5 seconds...', error);
      setTimeout(() => connectWebSocket(onTableUpdate), 5000);
    });
  } catch (err) {
    console.error('Failed to initialize SockJS connection', err);
  }
};

export const disconnectWebSocket = () => {
  if (stompClient !== null) {
    try {
      stompClient.disconnect();
    } catch (e) {
      // Suppress if already closed
    }
    stompClient = null;
  }
};
