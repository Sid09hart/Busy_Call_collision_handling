const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
const redisClient = require("./redis");
const setupSocket = require("./socket");
const createCallRouter = require("./routes/callRoutes");

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: [
    "https://busy-call-collision-handling.vercel.app",
    "http://localhost:5173"
  ],
  credentials: true,
}));
app.use(express.json());

// Socket setup
const { io, userSockets } = setupSocket(server);

// API routes
app.use("/api", createCallRouter(userSockets, io));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
