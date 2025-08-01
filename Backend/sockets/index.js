const { Server } = require('socket.io');
const registerSocketEvents = require('./events');

const userSockets = new Map();

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "https://busy-call-collision-handling.vercel.app",
        "http://localhost:5173"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    registerSocketEvents(socket, userSockets, io);
  });

  return { io, userSockets };
}

module.exports = setupSocket;
