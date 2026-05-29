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

function broadcast(payload) {
    const message = JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
    });

    for (const sockets of clients.values()) {
        for (const socket of sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(message);
            }
        }
    }
}

function getOnlineUsersCount() {
    return clients.size;
}

function isUserOnline(userId) {
    return clients.has(userId);
}

function getConnectedUserIds() {
    return Array.from(clients.keys());
}

module.exports = {
    addClient,
    removeClient,
    removeSocket,
    sendToUser,
    broadcast,
    getOnlineUsersCount,
    isUserOnline,
    getConnectedUserIds
};