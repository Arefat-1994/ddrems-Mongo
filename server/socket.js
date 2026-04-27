const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
      }
    });

    io.on('connection', (socket) => {
      console.log('[SOCKET] User connected:', socket.id);

      // Join a specific user room
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`[SOCKET] User ${userId} joined their private room`);
      });

      // Join a generic room (e.g., for specific agreements or properties)
      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`[SOCKET] User joined room: ${room}`);
      });

      // Handle generic notifications
      socket.on('send_notification', (data) => {
        // data: { userId, title, message, type }
        io.to(`user_${data.userId}`).emit('new_notification', data);
      });

      socket.on('disconnect', () => {
        console.log('[SOCKET] User disconnected:', socket.id);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  // Helper to emit to a specific user
  emitToUser: (userId, event, data) => {
    if (io) {
      io.to(`user_${userId}`).emit(event, data);
    }
  },
  // Helper to emit to a specific room
  emitToRoom: (room, event, data) => {
    if (io) {
      io.to(room).emit(event, data);
    }
  },
  // Helper to broadcast to all clients
  broadcast: (event, data) => {
    if (io) {
      io.emit(event, data);
    }
  }
};
