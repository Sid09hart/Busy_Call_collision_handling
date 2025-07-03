const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require("path");

dotenv.config();

const app = express();
const server = http.createServer(app);
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


// app.use(cors());
app.use(cors({
  origin: [
    "https://busy-call-collision-handling.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const redisClient = createClient({
  
  url: process.env.REDIS_URL,

   socket: {
    tls: true,
    reconnectStrategy: retries => Math.min(retries * 100, 3000)
   }
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});


redisClient.connect()
  .then(() => console.log("✅ Redis connected"))
 .catch((err) => console.error("❌ Redis connect failed:", err));

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on("register", (callerId) => {
    userSockets.set(callerId, socket.id);
    console.log(`📲 Registered socket for: ${callerId}`);
  });

  socket.on("disconnect", () => {
    for (const [user, id] of userSockets.entries()) {
      if (id === socket.id) {
        userSockets.delete(user);
        break;
      }
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

app.post('/call', async (req, res) => {
  const { caller, receiver } = req.body;
  const callKey = `call:${caller}:${receiver}`;
  const reverseKey = `call:${receiver}:${caller}`;
  const callerSocketId = userSockets.get(caller);

  try {
    const [forwardExists, reverseExists] = await Promise.all([
      redisClient.exists(callKey),
      redisClient.exists(reverseKey),
    ]);

    if (forwardExists) {
      return res.status(200).json({ message: "Call already active." });
    }

    if (reverseExists) {
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", {
          caller,
          receiver,
          status: "❌ Rejected — Receiver already called you first.",
        });
      }
      return res.status(200).json({ message: "Collision: reverse call exists." });
    }

    await redisClient.set(callKey, "active", { EX: 30 });

    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", {
        caller,
        receiver,
        status: "✅ Call accepted",
      });
    }

    return res.status(200).json({ message: "Call initiated." });
  } catch (err) {
    console.error("❌ Redis error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
