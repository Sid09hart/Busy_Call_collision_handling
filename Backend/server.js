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
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());


// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// 🔄 Optional: You can add a default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
})
 


const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// redisClient.connect().catch(console.error);
redisClient.connect()
  .then(() => console.log("✅ Redis connected"))
  .catch(console.error);


io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
});





const userSockets = new Map(); // callerId => socket.id

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
      // Duplicate call from same user (ignore)
      return res.status(200).json({ message: "Call already active." });
    }

    if (reverseExists) {
      // Collision: the other user initiated first
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", {
          caller,
          receiver,
          status: "❌ Rejected — Receiver already called you first.",
        });
      }
      return res.status(200).json({ message: "Collision: reverse call exists." });
    }

    // First valid call
    await redisClient.set(callKey, "active", { EX: 30 }); // expires in 30s

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
