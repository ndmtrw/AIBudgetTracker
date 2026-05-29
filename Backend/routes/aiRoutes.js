const express = require("express");
const { createSuggestions, getSuggestions } = require("../controllers/aiController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/suggestions", authMiddleware, createSuggestions);
router.get("/suggestions", authMiddleware, getSuggestions);

module.exports = router;