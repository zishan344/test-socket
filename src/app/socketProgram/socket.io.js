// socket-config.js
const io = require("socket.io");
const corsConfig = require("../config/cors.config");

function configureSocketIO(server) {
  const socketIOInstance = io(server, {
    pingTimeout: 60000,
    cors: corsConfig,
    transports: ["websocket", "polling"],
  });

  socketIOInstance.on("connection", (socket) => {
    console.log("socket connection io");

    socket.on("setup", (userData) => {
      socket.join(userData?.PersonID);
      socket.emit("connected");
    });

    socket.on("joinRoom", (roomId, userId) => {
      socket.join(roomId);
    });

    socket.on("sendMessage", (data) => {
      socket.to(data.messageRoomId).emit("newMessageReceived", data);
    });

    socket.on("startTyping", (roomId, userId) => {
      socket.to(roomId).emit("userTyping", { roomId, userId });
    });

    socket.on("stopTyping", (roomId, userId) => {
      socket.to(roomId).emit("userStoppedTyping", { roomId, userId });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    // Event listener for the 'error' event
    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });
  });
}

module.exports = configureSocketIO;
