const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Serve your frontend files from 'public' folder

// To keep track of connected clients (max 2 for simple 1:1)
let connectedClients = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Add user to connected list (max 2)
  if (connectedClients.length < 2) {
    connectedClients.push(socket.id);
  } else {
    // Too many users - could emit "room full" here or just disconnect
    socket.emit('room-full');
    socket.disconnect();
    return;
  }

  // Relay chat messages
  socket.on('message', (data) => {
    socket.broadcast.emit('message', { msg: data, socket_id: socket.id });
  });

  // Relay WebRTC signals
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  // Handle disconnect - notify other user to reload page
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from connected clients
    connectedClients = connectedClients.filter(id => id !== socket.id);

    // Inform remaining user(s) that peer disconnected
    socket.broadcast.emit('peer-disconnect');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
