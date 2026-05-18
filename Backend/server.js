const express = require("express");
const cors = require("cors");
const http = require("http");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const { readData, writeData } = require("./services/fileService");
const { calculateBudgetStatus, getBudgetWarning, getCurrentMonth } = require("./services/budgetService");
const { getDashboardData } = require("./services/dashboardService");
const { generateSavingSuggestions } = require("./services/aiService");
const { setupWebSocketServer } = require("./realtime/websocketServer");
const realtimeService = require("./services/realtimeService");
const { detectUnusualSpending } = require("./services/spendingAnalysis");

const app = express();
const server = http.createServer(app);

const PORT = 5000;
const JWT_SECRET = "budget_tracker_secret_key";

app.use(cors());
app.use(express.json());

setupWebSocketServer(server);

function sendRealTimeMessage(userId, payload) {
    return realtimeService.sendToUser(userId, payload);
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: "Missing authorization token." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token." });
    }
}

function adminMiddleware(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
    }

    next();
}

app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Username, email and password are required."
        });
    }

    const users = readData("users.json");

    const existingUser = users.find(x => x.email === email);

    if (existingUser) {
        return res.status(400).json({
            message: "User with this email already exists."
        });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        role: users.length === 0 ? "admin" : "user",
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData("users.json", users);

    res.status(201).json({
        message: "User registered successfully.",
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
        }
    });
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    const users = readData("users.json");
    const user = users.find(x => x.email === email);

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password."
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password."
        });
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "2h"
        }
    );

    res.json({
        message: "Login successful.",
        token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});

app.post("/api/budget", authMiddleware, (req, res) => {
    const { limit } = req.body;

    if (!limit || Number(limit) <= 0) {
        return res.status(400).json({
            message: "Budget limit must be greater than 0."
        });
    }

    const budgets = readData("budgets.json");
    const currentMonth = getCurrentMonth();

    const existingBudget = budgets.find(x =>
        x.userId === req.user.id &&
        x.month === currentMonth
    );

    if (existingBudget) {
        existingBudget.limit = Number(limit);
    } else {
        budgets.push({
            id: uuidv4(),
            userId: req.user.id,
            month: currentMonth,
            limit: Number(limit),
            createdAt: new Date().toISOString()
        });
    }

    writeData("budgets.json", budgets);

    res.json({
        message: "Monthly budget saved successfully.",
        budgetStatus: calculateBudgetStatus(req.user.id)
    });
});

app.get("/api/budget", authMiddleware, (req, res) => {
    res.json(calculateBudgetStatus(req.user.id));
});

app.post("/api/transactions", authMiddleware, (req, res) => {
    const { type, amount, category, description, date } = req.body;

    if (!type || !amount || !category || !date) {
        return res.status(400).json({
            message: "Type, amount, category and date are required."
        });
    }

    if (type !== "income" && type !== "expense") {
        return res.status(400).json({
            message: "Type must be income or expense."
        });
    }

    if (Number(amount) <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0."
        });
    }

    const transactions = readData("transactions.json");

    const newTransaction = {
        id: uuidv4(),
        userId: req.user.id,
        type,
        amount: Number(amount),
        category,
        description: description || "",
        date,
        createdAt: new Date().toISOString()
    };

    transactions.push(newTransaction);
    writeData("transactions.json", transactions);

    if (type === "expense") {
        const budgetStatus = calculateBudgetStatus(req.user.id);
        const warning = getBudgetWarning(budgetStatus);

        if (warning) {
            sendRealTimeMessage(req.user.id, {
                type: "budget_alert",
                data: warning
            });
        }

        const unusualSpending = detectUnusualSpending(
            req.user.id,
            newTransaction,
            transactions
        );

        if (unusualSpending) {
            sendRealTimeMessage(req.user.id, unusualSpending);
        }
    }

    sendRealTimeMessage(req.user.id, {
        type: "transaction_created",
        message: "New transaction added.",
        transaction: newTransaction
    });

    res.status(201).json({
        message: "Transaction created successfully.",
        transaction: newTransaction
    });
});

app.get("/api/transactions", authMiddleware, (req, res) => {
    const { category, type, sortBy, order } = req.query;

    let transactions = readData("transactions.json")
        .filter(x => x.userId === req.user.id);

    if (category) {
        transactions = transactions.filter(x =>
            x.category.toLowerCase() === category.toLowerCase()
        );
    }

    if (type) {
        transactions = transactions.filter(x => x.type === type);
    }

    if (sortBy === "date") {
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (sortBy === "amount") {
        transactions.sort((a, b) => a.amount - b.amount);
    }

    if (order === "desc") {
        transactions.reverse();
    }

    res.json(transactions);
});

app.put("/api/transactions/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { type, amount, category, description, date } = req.body;

    const transactions = readData("transactions.json");

    const transaction = transactions.find(x =>
        x.id === id &&
        x.userId === req.user.id
    );

    if (!transaction) {
        return res.status(404).json({
            message: "Transaction not found."
        });
    }

    if (type && type !== "income" && type !== "expense") {
        return res.status(400).json({
            message: "Type must be income or expense."
        });
    }

    if (amount !== undefined && Number(amount) <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0."
        });
    }

    transaction.type = type || transaction.type;
    transaction.amount = amount !== undefined ? Number(amount) : transaction.amount;
    transaction.category = category || transaction.category;
    transaction.description = description !== undefined ? description : transaction.description;
    transaction.date = date || transaction.date;
    transaction.updatedAt = new Date().toISOString();

    writeData("transactions.json", transactions);

    const budgetStatus = calculateBudgetStatus(req.user.id);
    const warning = getBudgetWarning(budgetStatus);

    if (warning) {
        sendRealTimeMessage(req.user.id, {
            type: "budget_alert",
            data: warning
        });
    }

    res.json({
        message: "Transaction updated successfully.",
        transaction
    });
});

app.delete("/api/transactions/:id", authMiddleware, (req, res) => {
    const { id } = req.params;

    const transactions = readData("transactions.json");

    const transactionExists = transactions.some(x =>
        x.id === id &&
        x.userId === req.user.id
    );

    if (!transactionExists) {
        return res.status(404).json({
            message: "Transaction not found."
        });
    }

    const filteredTransactions = transactions.filter(x =>
        !(x.id === id && x.userId === req.user.id)
    );

    writeData("transactions.json", filteredTransactions);

    res.json({
        message: "Transaction deleted successfully."
    });
});

app.get("/api/dashboard", authMiddleware, (req, res) => {
    const dashboard = getDashboardData(req.user.id);
    const budgetStatus = calculateBudgetStatus(req.user.id);

    res.json({
        dashboard,
        budgetStatus
    });
});

app.post("/api/ai/suggestions", authMiddleware, (req, res) => {
    sendRealTimeMessage(req.user.id, {
        type: "ai_status",
        message: "AI is analyzing your spending habits."
    });

    const suggestions = generateSavingSuggestions(req.user.id);

    sendRealTimeMessage(req.user.id, {
        type: "ai_suggestions_ready",
        message: "AI suggestions are ready.",
        suggestions
    });

    res.json({
        message: "AI suggestions generated successfully.",
        suggestions
    });
});

app.get("/api/ai/suggestions", authMiddleware, (req, res) => {
    const suggestions = readData("suggestions.json")
        .filter(x => x.userId === req.user.id);

    res.json(suggestions);
});

app.get("/api/ai/realtime-status", authMiddleware, (req, res) => {
    res.json({
        onlineUsers: realtimeService.getOnlineUsersCount()
    });
});

app.get("/api/admin/stats", authMiddleware, adminMiddleware, (req, res) => {
    const users = readData("users.json");
    const transactions = readData("transactions.json");
    const suggestions = readData("suggestions.json");

    const categoryCounter = {};

    transactions.forEach(x => {
        if (!categoryCounter[x.category]) {
            categoryCounter[x.category] = 0;
        }

        categoryCounter[x.category]++;
    });

    let mostUsedCategory = null;
    let highestCount = 0;

    Object.entries(categoryCounter).forEach(([category, count]) => {
        if (count > highestCount) {
            mostUsedCategory = category;
            highestCount = count;
        }
    });

    res.json({
        totalUsers: users.length,
        totalTransactions: transactions.length,
        totalSuggestions: suggestions.length,
        mostUsedCategory
    });
});

server.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});