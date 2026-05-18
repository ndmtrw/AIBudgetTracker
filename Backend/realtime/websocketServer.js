const WebSocket = require("ws");
const realtimeService = require("../services/realtimeService");

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (socket, request) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const userIdFromUrl = url.searchParams.get("userId");

        if (userIdFromUrl) {
            realtimeService.addClient(userIdFromUrl, socket);

            socket.send(JSON.stringify({
                type: "connection_success",
                message: "WebSocket connected successfully.",
                userId: userIdFromUrl
            }));
        }

        socket.on("message", (message) => {
            try {
                const data = JSON.parse(message.toString());

                if (data.type === "connect_user" && data.userId) {
                    realtimeService.addClient(data.userId, socket);

                    socket.send(JSON.stringify({
                        type: "connection_success",
                        message: "WebSocket connected successfully.",
                        userId: data.userId
                    }));
                }

                if (data.type === "ping") {
                    socket.send(JSON.stringify({
                        type: "pong",
                        message: "WebSocket server is active."
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
            if (userIdFromUrl) {
                realtimeService.removeClient(userIdFromUrl, socket);
            }
        });

        socket.on("error", () => {
            if (userIdFromUrl) {
                realtimeService.removeClient(userIdFromUrl, socket);
            }
        });
    });
}

module.exports = {
    setupWebSocketServer
};