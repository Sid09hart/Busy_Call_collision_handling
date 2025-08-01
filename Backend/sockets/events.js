function registerSocketEvents(socket, userSockets, io) {
  socket.on("register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`📲 Registered socket for: ${userId}`);
  });

  socket.on("disconnect", () => {
    for (const [user, id] of userSockets.entries()) {
      if (id === socket.id) {
        userSockets.delete(user);
        console.log(`❌ Socket disconnected: ${socket.id}`);
        break;
      }
    }
  });

  // You can add more events here in future: e.g. callEnd, ringTone, etc.
}

module.exports = registerSocketEvents;
