const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
    const roomId = uuidv4();
    res.redirect(`/room/${roomId}`);
});

app.get('/room/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join', (roomId) => {
        if (!rooms[roomId]) rooms[roomId] = [];

        if (rooms[roomId].length >= 2) {
            socket.emit('full');
            return;
        }

        socket.join(roomId);
        rooms[roomId].push(socket.id);

        if (rooms[roomId].length === 2) {
            socket.to(roomId).emit('ready');
        }

        socket.on('offer', (data) => {
            socket.to(roomId).emit('offer', data);
        });

        socket.on('answer', (data) => {
            socket.to(roomId).emit('answer', data);
        });

        socket.on('ice-candidate', (data) => {
            socket.to(roomId).emit('ice-candidate', data);
        });

        socket.on('message', (data) => {
            socket.to(roomId).emit('message', data);
        });

        socket.on('end-call', () => {
            socket.to(roomId).emit('end-call');
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
            }
        });

        socket.on('disconnect', () => {
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                socket.to(roomId).emit('end-call');
                if (rooms[roomId].length === 0) delete rooms[roomId];
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
