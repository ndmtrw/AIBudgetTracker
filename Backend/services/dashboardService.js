const TransactionRepository = require("../repositories/TransactionRepository");

function getDashboardData(userId) {
    const transactions = TransactionRepository.getTransactionsByUser(userId);

    const totalIncome = transactions
        .filter(x => x.type === "income")
        .reduce((sum, x) => sum + Number(x.amount), 0);

    const totalExpenses = transactions
        .filter(x => x.type === "expense")
        .reduce((sum, x) => sum + Number(x.amount), 0);

    const expensesByCategory = {};

    transactions
        .filter(x => x.type === "expense")
        .forEach(x => {
            if (!expensesByCategory[x.category]) {
                expensesByCategory[x.category] = 0;
            }

            expensesByCategory[x.category] += Number(x.amount);
        });

    let biggestSpendingCategory = null;
    let biggestCategoryAmount = 0;

    Object.entries(expensesByCategory).forEach(([category, amount]) => {
        if (amount > biggestCategoryAmount) {
            biggestSpendingCategory = category;
            biggestCategoryAmount = amount;
        }
    });

    const recentTransactions = transactions.slice(0, 5);

    return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        biggestSpendingCategory,
        biggestCategoryAmount,
        expensesByCategory,
        recentTransactions
    };
}

module.exports = {
    getDashboardData
};