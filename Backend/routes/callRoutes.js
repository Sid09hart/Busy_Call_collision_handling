const express = require("express");
const {
  handleCall,
  cancelCall,
  getCallStatus,
} = require("../controllers/callController");

function createCallRouter(userSockets, io) {
  const router = express.Router();

  router.post("/call", (req, res) => handleCall(req, res, userSockets, io));
  router.post("/cancel", cancelCall);
  router.get("/status/:user", getCallStatus);

  return router;
}

module.exports = createCallRouter;
