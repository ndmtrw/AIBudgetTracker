const express = require("express");
const notificationService = require("../services/notificationService");

function createNotificationRouter(authMiddleware) {
    const router = express.Router();

    router.get("/", authMiddleware, (req, res) => {
        res.json(notificationService.getUserNotifications(req.user.id));
    });

    router.put("/:id/read", authMiddleware, (req, res) => {
        const notification = notificationService.markNotificationAsRead(
            req.user.id,
            req.params.id
        );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found."
            });
        }

        res.json({
            message: "Notification marked as read.",
            notification
        });
    });

    router.put("/read-all", authMiddleware, (req, res) => {
        const notifications = notificationService.markAllNotificationsAsRead(req.user.id);

        res.json({
            message: "All notifications marked as read.",
            notifications
        });
    });

    return router;
}

module.exports = {
    createNotificationRouter
};