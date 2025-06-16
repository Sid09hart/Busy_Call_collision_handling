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

redisClient.connect().catch(console.error);

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
});


app.post('/call', async (req, res) => {
  const { caller, receiver } = req.body;
  console.log("📞 Call API hit with:", caller, receiver);

  const callKey = `call:${caller}:${receiver}`;
  const reverseKey = `call:${receiver}:${caller}`;

  // Check if receiver already called caller (i.e. reverse exists)
  const reverseExists = await redisClient.exists(reverseKey);
  const currentExists = await redisClient.exists(callKey);

  if (reverseExists) {
    // Reverse already exists → other side initiated first
    io.emit("callRejected", {
      caller,
      receiver,
      status: "another user called first",
    });

    return res.status(200).json({ message: "Call rejected due to collision - other caller was first." });
  }

  if (!currentExists) {
    // No collision: this is the first call
    await redisClient.set(callKey, "active", { EX: 30 });

    io.emit("callAccepted", {
      caller,
      receiver,
      status: "✅ Call accepted (first caller)",
    });

    return res.status(200).json({ message: "Call accepted." });
  }

  // If the callKey already exists, don’t allow repeat calls
  return res.status(200).json({ message: "Call already active." });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
