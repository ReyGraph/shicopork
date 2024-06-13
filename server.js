const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000; // Make sure you open your localhost site according to the port, which is localhost:3000 in this case,

const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGame', ({ username, roomId }) => {
        if (!roomId) {
            roomId = generateRoomId();
        }
        
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {};
        }

        rooms[roomId][socket.id] = {
            username,
            x: Math.floor(Math.random() * 950) + 25,
            y: 700,
            xVelocity: 0,
            yVelocity: 0
        };

        socket.emit('currentPlayers', rooms[roomId]);
        socket.broadcast.to(roomId).emit('newPlayer', {
            id: socket.id,
            position: rooms[roomId][socket.id],
            username
        });

        socket.on('playerMove', (position) => {
            rooms[roomId][socket.id] = position;
            socket.broadcast.to(roomId).emit('playerMove', {
                id: socket.id,
                position,
                username
            });
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
            delete rooms[roomId][socket.id];
            io.to(roomId).emit('playerDisconnect', socket.id);

            if (Object.keys(rooms[roomId]).length === 0) {
                delete rooms[roomId];
            }
        });
    });
});

function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
