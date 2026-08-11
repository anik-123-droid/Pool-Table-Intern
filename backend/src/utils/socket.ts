import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://pool-table-opal.vercel.app',
    'https://pool-table-intern.vercel.app'
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('⚡ Client connected to socket:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔥 Client disconnected from socket:', socket.id);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitTableUpdate = () => {
  if (io) {
    io.emit('tables_updated');
    io.emit('booking_updated');
  }
};
