const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH'],
      allowedHeaders: ['authorization'],
      credentials: true,
    },
  });

  // Authenticate socket (optional) and join admin room
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization?.split(' ')[1];
      if (token) {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = user;
        if (user?.role === 'admin') {
          socket.join('admins');
        }
      }
    } catch (_e) {
      // Ignore auth errors for now; unsecured sockets won't join admin room
    }
    next();
  });

  io.on('connection', (socket) => {
    // Basic heartbeat event
    socket.emit('realtime:ready', { ok: true, ts: Date.now() });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToAdmins(event, payload) {
  if (!io) return;
  io.to('admins').emit(event, payload);
}

module.exports = { initIO, getIO, emitToAdmins };
