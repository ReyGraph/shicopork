//LISTEN HERE, I'VE TRIED TO EXPLAIN THIS CODE AS MUCH AS I CAN IN MY WAY :) SO DO NOT COMPLAIN, its just a basic project made by me, I'm still learning Node.js, I have only done the explanation on game.js, as other files are easy to understand. 
// The room feature might not work properly as expected as it does not show the room code, you will have to paste the room code from your search bar, 
// If you try to run this on your local machine, ( which i suggest you do not until i complete the game development, because there's no point in playing this now) as its in development, there's not much
//... - in there so you can just use this project to test out what i've made, or make this better yourself, this is an open source project.
// I might discontinue this project, but as of now, it will be continued, 



//  - MAIN ISSUES

// - NO MUSIC / SFX
// - NOT A SOLID MAP TO PLAY
// - BUGS WITH CONTROLS,
// - MOVE-ABLE OBSTACLES HAS ISSUES WITH PLAYER COLLISION
// - ON COLLIDE TRIGGER EVENT IS RETARDED
// - IDK.





const socket = io();
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const joinButton = document.getElementById('joinButton');
const createRoomButton = document.getElementById('createRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const usernameInput = document.getElementById('username-input');
const roomCodeInput = document.getElementById('room-code-input');
const usernameContainer = document.getElementById('username-container');
const roomCodeContainer = document.getElementById('room-code-container');
const gameContainer = document.getElementById('game-container');

let username = '';
let roomId = '';

const players = {};
const playerSize = { width: 50, height: 50 };
const gravity = 0.6;
const friction = 0.8;

const playerImage = new Image();
playerImage.src = 'images/player.png';

const coins = [];
let score = 0;

let ropeAttached = false;
let ropeLength = 200;
const ropes = [];

const key = { x: 400, y: 200, collected: false }; // Positioned key above the ground ( making the key spawn above ground, and not under or inside the barriers)
const door = { x: 850, y: 700, open: false };

let isOnGround = false;
const groundHeight = 50;
const barrierWidth = 50;

// Movable square
const square = { x: 400, y: 700, width: 50, height: 50, xVelocity: 0, yVelocity: 0, held: false };

// Pressure plate
const pressurePlate = { x: 350, y: 750, width: 50, height: 10, activated: false };

joinButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
        usernameContainer.style.display = 'none';
        roomCodeContainer.style.display = 'flex';
    }
});

createRoomButton.addEventListener('click', () => {
    if (username) {
        roomId = generateRoomId();
        window.location.hash = roomId;
        startGameSetup();
    }
});

joinRoomButton.addEventListener('click', () => {
    roomId = roomCodeInput.value.trim();
    if (roomId && username) {
        window.location.hash = roomId;
        startGameSetup();
    }
});

function startGameSetup() {
    roomCodeContainer.style.display = 'none';
    gameContainer.style.display = 'flex';
    socket.emit('joinGame', { username, roomId });
}

socket.on('currentPlayers', (currentPlayers) => {
    for (let id in currentPlayers) {
        players[id] = currentPlayers[id];
    }
    startGame();
});

socket.on('newPlayer', (data) => {
    players[data.id] = data.position;
    players[data.id].username = data.username;
});

socket.on('playerMove', (data) => {
    players[data.id] = data.position;
    players[data.id].username = data.username;
});

socket.on('playerDisconnect', (id) => {
    delete players[id];
});

socket.on('startGame', () => {
    startGame();
});

function startGame() {
    generateCoins();
    requestAnimationFrame(updateGame);
}

function updateGame() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawLevel();
    drawPlayers();
    drawCoins();
    drawKey();
    drawDoor();
    drawRopes();
    drawSquare();
    applyPhysics();
    checkCollisions();
    requestAnimationFrame(updateGame);
}

function drawLevel() { // making the basic level, idk how i did this, but yes, i also gotta make a top barrier
    context.fillStyle = '#000';
    context.fillRect(50, 750, 900, 50); // Ground
    context.fillRect(200, 650, 100, 20); // Platform
    context.fillRect(700, 550, 100, 20); // Platform
    context.fillRect(0, 0, 50, canvas.height); // Left Barrier
    context.fillRect(canvas.width - 50, 0, 50, canvas.height); // Right Barrier
    context.fillStyle = pressurePlate.activated ? 'green' : 'red';
    context.fillRect(pressurePlate.x, pressurePlate.y, pressurePlate.width, pressurePlate.height); // Pressure plate ( might not work )
}

function drawPlayers() {
    context.textAlign = "center";
    context.font = "16px Arial";
    for (let id in players) {
        context.drawImage(playerImage, players[id].x, players[id].y, playerSize.width, playerSize.height);
        context.fillText(players[id].username, players[id].x + playerSize.width / 2, players[id].y - 10);
    }
}

function drawCoins() {
    context.fillStyle = 'gold';
    for (let coin of coins) {
        context.beginPath();
        context.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
        context.fill();
    }
}

function drawKey() {
    if (!key.collected) {
        context.fillStyle = 'yellow';
        context.fillRect(key.x, key.y, 20, 20);
    }
}

function drawDoor() {
    context.fillStyle = door.open ? 'green' : 'brown';
    context.fillRect(door.x, door.y, 50, 50);
}

function drawRopes() {
    context.strokeStyle = 'brown';
    context.lineWidth = 5;
    for (let rope of ropes) {
        context.beginPath();
        context.moveTo(rope.x1, rope.y1);
        context.lineTo(rope.x2, rope.y2);
        context.stroke();
    }
}

function drawSquare() {
    context.fillStyle = 'blue';
    context.fillRect(square.x, square.y, square.width, square.height);
}

function applyPhysics() {
    for (let id in players) {
        const player = players[id];
        player.yVelocity += gravity;
        player.x += player.xVelocity;
        player.y += player.yVelocity;

        // Check if the player is on the ground
        if (player.y + playerSize.height >= canvas.height - groundHeight) {
            player.y = canvas.height - groundHeight - playerSize.height;
            player.yVelocity = 0;
            isOnGround = true;
        } else {
            isOnGround = false;
        }

        // Check for collision with the platforms
        checkPlatformCollision(player);

        // Check for collision with the barriers, the moveable object is not counted in for this, so it will have bugs
        if (player.x < barrierWidth) {
            player.x = barrierWidth;
        } else if (player.x + playerSize.width > canvas.width - barrierWidth) {
            player.x = canvas.width - barrierWidth - playerSize.width;
        }

        player.xVelocity *= friction;
        player.yVelocity *= friction;
    }

    // Apply gravity to the movable square.......
    if (!square.held) {
        square.yVelocity += gravity;
        square.y += square.yVelocity;
        if (square.y + square.height > canvas.height - groundHeight) {
            square.y = canvas.height - groundHeight - square.height;
            square.yVelocity = 0;
        }

        // Update square's position
        square.x += square.xVelocity;
        square.y += square.yVelocity;

        // Apply friction to the square
        square.xVelocity *= friction;
        square.yVelocity *= friction;
    }
}

function checkPlatformCollision(player) {
    const platforms = [
        { x: 200, y: 650, width: 100, height: 20 },
        { x: 700, y: 550, width: 100, height: 20 }
    ];

    for (let platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + playerSize.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + playerSize.height > platform.y) {
            
            // Player is on top of the platform
            if (player.y + playerSize.height - player.yVelocity <= platform.y) {
                player.y = platform.y - playerSize.height;
                player.yVelocity = 0;
                isOnGround = true;
            }
        }
    }
}

function checkCollisions() {
    pressurePlate.activated = false;
    for (let id in players) {
        const player = players[id];
        // Coin collection
        for (let i = 0; i < coins.length; i++) {
            if (isColliding(player, coins[i], 10)) {
                coins.splice(i, 1);
                score++;
                document.getElementById('score').textContent = `Score: ${score}`;
            }
        }

        // Key collection
        if (!key.collected && isColliding(player, key, 20)) {
            key.collected = true;
        }

        // Door unlocking
        if (key.collected && door.open && isColliding(player, door, 50)) {
            alert('Level Completed!');
             // Reset for next level or load new level ( THERE IS ONLY ONE LEVEL FOR NOW )
            key.collected = false;
            door.open = false;
            for (let playerId in players) {
                players[playerId].x = 50;
                players[playerId].y = 700;
            }
        }

        // Player interaction with the square
        if (isColliding(player, square, square.width)) {
            if (player.y + playerSize.height <= square.y + 10) { // Player is above the square
                player.y = square.y - playerSize.height;
                player.yVelocity = 0;
                isOnGround = true;
            } else if (player.x + playerSize.width <= square.x + 10) { // Player is left of the square
                player.x = square.x - playerSize.width;
                square.held = true;
                square.xVelocity = player.xVelocity;
            } else if (player.x >= square.x + square.width - 10) { // Player is right of the square
                player.x = square.x + square.width;
                square.held = true;
                square.xVelocity = player.xVelocity;
            } else if (player.y >= square.y + square.height - 10) { // Player is below the square
                player.y = square.y + square.height;
                player.yVelocity = 0;
            }
        } else {
            square.held = false;
        }

        // Check if the square is on the pressure plate
        if (isColliding(square, pressurePlate, pressurePlate.width)) {
            pressurePlate.activated = true;
        }
    }

    if (pressurePlate.activated) {
        openDoor();
    } else {
        door.open = false;
    }
}

function isColliding(object1, object2, size) {
    return object1.x < object2.x + size &&
        object1.x + playerSize.width > object2.x &&
        object1.y < object2.y + size &&
        object1.y + playerSize.height > object2.y;
}

function generateCoins() {
    coins.length = 0;
    for (let i = 0; i < 10; i++) {
        let coinX, coinY;
        do {
            coinX = Math.random() * (canvas.width - 20) + 10;
            coinY = Math.random() * (canvas.height - 300) + 50;
        } while (isInsideBarrier(coinX, coinY)); // // Check if the coin is inside a barrier yes...
        coins.push({ x: coinX, y: coinY });
    }
}

function isInsideBarrier(x, y) {
    // Check if the coin is inside any of the barriers
    return (x > 0 && x < 50 && y > 0 && y < canvas.height) ||
           (x > canvas.width - 50 && x < canvas.width && y > 0 && y < canvas.height);
}

document.addEventListener('keydown', (e) => {
    const player = players[socket.id];
    if (!player) return;

    switch (e.key) {
        case 'ArrowLeft':
            player.xVelocity = -5;
            break;
        case 'ArrowRight':
            player.xVelocity = 5;
            break;
        case 'ArrowUp':
            // Only allow jumping when the player is on the ground - or else the players would be flying
            if (isOnGround) {
                player.yVelocity = -15; // Increase jump force to 15 pixels ( Recommended jump force = -28 for the game)
                isOnGround = false;
            }
            break;
        case ' ':
            if (!ropeAttached) {
                ropeAttached = true;
                ropes.push({
                    playerId: socket.id,
                    x1: player.x + playerSize.width / 2,
                    y1: player.y + playerSize.height / 2,
                    x2: player.x + playerSize.width / 2,
                    y2: player.y + playerSize.height / 2
                });
            } else {
                ropeAttached = false;
                ropes.pop();
            }
            break;
    }
    socket.emit('playerMove', player);
});

document.addEventListener('keyup', (e) => {
    const player = players[socket.id];
    if (!player) return;

    switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
            player.xVelocity = 0;
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            player.yVelocity = 0;
            break;
    }
});

function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
}

function openDoor() {
    door.open = true;
}
