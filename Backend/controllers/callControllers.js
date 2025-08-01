const redisClient = require("../redis");
const STATUS = require("../utils/statusCodes");

async function handleCall(req, res, userSockets, io) {
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
      return res.json({ status: STATUS.CALL_EXISTS });
    }

    if (reverseExists) {
      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", {
          status: STATUS.COLLISION,
          message: "Receiver already called you.",
        });
      }
      return res.json({ status: STATUS.COLLISION });
    }

    await redisClient.set(callKey, "active", { EX: 30 });

    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", {
        status: STATUS.CALL_INITIATED,
      });
    }

    return res.json({ status: STATUS.CALL_INITIATED });
  } catch (err) {
    console.error("Error in handleCall:", err);
    return res.status(500).json({ status: STATUS.INTERNAL_ERROR });
  }
}

async function cancelCall(req, res) {
  const { caller, receiver } = req.body;
  const callKey = `call:${caller}:${receiver}`;

  try {
    const exists = await redisClient.exists(callKey);
    if (!exists) return res.json({ status: STATUS.CALL_NOT_FOUND });

    await redisClient.del(callKey);
    return res.json({ status: STATUS.CALL_CANCELLED });
  } catch (err) {
    return res.status(500).json({ status: STATUS.INTERNAL_ERROR });
  }
}

async function getCallStatus(req, res) {
  const { user } = req.params;

  try {
    const keys = await redisClient.keys(`call:${user}:*`);
    if (keys.length === 0) return res.json({ status: "idle" });

    return res.json({ status: "in-call", keys });
  } catch (err) {
    return res.status(500).json({ status: STATUS.INTERNAL_ERROR });
  }
}

module.exports = {
  handleCall,
  cancelCall,
  getCallStatus,
};
