const WebSocket = require("ws");

const clients = new Map();

function addClient(userId, socket) {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }

    clients.get(userId).add(socket);
}

function removeClient(userId, socket) {
    if (!clients.has(userId)) {
        return;
    }

    clients.get(userId).delete(socket);

    if (clients.get(userId).size === 0) {
        clients.delete(userId);
    }
}

function removeSocket(socket) {
    for (const [userId, sockets] of clients.entries()) {
        if (sockets.has(socket)) {
            sockets.delete(socket);
        }

        if (sockets.size === 0) {
            clients.delete(userId);
        }
    }
}

function sendToUser(userId, payload) {
    if (!clients.has(userId)) {
        return false;
    }

    const message = JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
    });

    for (const socket of clients.get(userId)) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    }

    return true;
}

function getOnlineUsersCount() {
    return clients.size;
}

module.exports = {
    addClient,
    removeClient,
    removeSocket,
    sendToUser,
    getOnlineUsersCount
};