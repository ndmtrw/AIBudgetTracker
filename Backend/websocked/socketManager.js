const WebSocket = require("ws");

const connectedUsers = new Map();

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", socket => {
        socket.on("message", message => {
            try {
                const data = JSON.parse(message);

                if (data.type === "connect_user" && data.userId) {
                    connectedUsers.set(data.userId, socket);

                    socket.send(JSON.stringify({
                        type: "connection_success",
                        message: "WebSocket connected successfully."
                    }));
                }
            } catch {
                socket.send(JSON.stringify({
                    type: "error",
                    message: "Invalid WebSocket message."
                }));
            }
        });

        socket.on("close", () => {
            for (const [userId, userSocket] of connectedUsers.entries()) {
                if (userSocket === socket) {
                    connectedUsers.delete(userId);
                }
            }
        });
    });
}

function sendRealTimeMessage(userId, payload) {
    const socket = connectedUsers.get(userId);

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

module.exports = {
    setupWebSocket,
    sendRealTimeMessage
};