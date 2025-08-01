const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    reconnectStrategy: retries => Math.min(retries * 100, 3000)
  }
});

redisClient.on("error", err => {
  console.error("❌ Redis error:", err);
});

module.exports = redisClient;
