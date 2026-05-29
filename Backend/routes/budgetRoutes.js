const express = require("express");
const { setBudget, getBudget } = require("../controllers/budgetController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, setBudget);
router.get("/", authMiddleware, getBudget);

module.exports = router;