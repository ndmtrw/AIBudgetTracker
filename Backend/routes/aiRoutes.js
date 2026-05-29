const express = require("express");
const { readData } = require("../services/fileService");
const { generateSavingSuggestions } = require("../services/aiService");
const realtimeService = require("../services/realtimeService");
const { generateSpendingInsights } = require("../services/spendingAnalysis");
const notificationService = require("../services/notificationService");

function createAiRouter(authMiddleware) {
    const router = express.Router();

    router.post("/suggestions", authMiddleware, (req, res) => {
        realtimeService.sendToUser(req.user.id, {
            type: "ai_status",
            message: "AI is analyzing your spending habits."
        });

        const suggestions = generateSavingSuggestions(req.user.id);

        realtimeService.sendToUser(req.user.id, {
            type: "ai_suggestions_ready",
            message: "AI suggestions are ready.",
            suggestions
        });

        notificationService.createNotification(req.user.id, {
            type: "ai_suggestions_ready",
            title: "AI suggestions ready",
            message: "Your saving suggestions have been generated.",
            level: "info",
            data: {
                suggestionsCount: suggestions.length
            }
        });

        res.json({
            message: "AI suggestions generated successfully.",
            suggestions
        });
    });

    router.get("/suggestions", authMiddleware, (req, res) => {
        const suggestions = readData("suggestions.json")
            .filter(x => x.userId === req.user.id);

        res.json(suggestions);
    });

    router.get("/insights", authMiddleware, (req, res) => {
        const transactions = readData("transactions.json");
        const budgets = readData("budgets.json");

        const currentMonth = new Date().toISOString().slice(0, 7);

        const monthlyBudget = budgets.find(x =>
            x.userId === req.user.id &&
            x.month === currentMonth
        );

        const insights = generateSpendingInsights(
            req.user.id,
            transactions,
            monthlyBudget ? Number(monthlyBudget.limit) : 0
        );

        res.json(insights);
    });

    router.get("/realtime-status", authMiddleware, (req, res) => {
        res.json({
            onlineUsers: realtimeService.getOnlineUsersCount(),
            currentUserOnline: realtimeService.isUserOnline(req.user.id)
        });
    });

    return router;
}

module.exports = {
    createAiRouter
};