const express = require("express");
const cors = require("cors");
const http = require("http");

const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");

const { setupWebSocket } = require("./websocket/socketManager");

const app = express();
const server = http.createServer(app);

const PORT = 5000;

app.use(cors());
app.use(express.json());

setupWebSocket(server);

app.get("/", (req, res) => {
    res.json({
        message: "AI Budget Tracker Backend is running."
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});