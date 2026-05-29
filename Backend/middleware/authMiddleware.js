const jwt = require("jsonwebtoken");

const JWT_SECRET = "budget_tracker_secret_key";

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Missing authorization token."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            message: "Invalid or expired token."
        });
    }
}

module.exports = {
    authMiddleware,
    JWT_SECRET
};