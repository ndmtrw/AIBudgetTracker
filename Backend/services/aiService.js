const { v4: uuidv4 } = require("uuid");
const TransactionRepository = require("../repositories/TransactionRepository");
const SuggestionRepository = require("../repositories/SuggestionRepository");

function generateSavingSuggestions(userId) {
    const transactions = TransactionRepository.getTransactionsByUser(userId)
        .filter(x => x.type === "expense");

    const categoryTotals = {};

    transactions.forEach(x => {
        if (!categoryTotals[x.category]) {
            categoryTotals[x.category] = 0;
        }

        categoryTotals[x.category] += Number(x.amount);
    });

    const generatedSuggestions = [];

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        let text = "";
        const lowerCategory = category.toLowerCase();

        if (lowerCategory.includes("food") && amount > 300) {
            text = "You spend a lot on food. Try cooking at home more often or setting a weekly food limit.";
        } else if (lowerCategory.includes("transport") && amount > 200) {
            text = "Your transport spending is high. Consider using public transport more often instead of taxis.";
        } else if (lowerCategory.includes("subscription") && amount > 100) {
            text = "You have high subscription expenses. Check if you use all paid services and cancel unnecessary ones.";
        } else if (amount > 500) {
            text = `Your spending in ${category} is high. Try setting a smaller monthly limit for this category.`;
        }

        if (text) {
            generatedSuggestions.push({
                id: uuidv4(),
                userId,
                category,
                amount,
                text,
                createdAt: new Date().toISOString()
            });
        }
    });

    if (generatedSuggestions.length > 0) {
        SuggestionRepository.createSuggestions(generatedSuggestions);
    }

    return generatedSuggestions;
}

module.exports = {
    generateSavingSuggestions
};