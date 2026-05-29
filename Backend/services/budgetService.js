const BudgetRepository = require("../repositories/BudgetRepository");
const TransactionRepository = require("../repositories/TransactionRepository");

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function calculateBudgetStatus(userId) {
    const currentMonth = getCurrentMonth();
    const budget = BudgetRepository.getBudgetByUserAndMonth(userId, currentMonth);

    if (!budget) {
        return {
            hasBudget: false,
            month: currentMonth,
            limit: 0,
            spent: 0,
            remaining: 0,
            percentageUsed: 0
        };
    }

    const monthlyExpenses = TransactionRepository.getTransactionsByUser(userId)
        .filter(x => x.type === "expense" && x.date.startsWith(currentMonth))
        .reduce((sum, x) => sum + Number(x.amount), 0);

    const percentageUsed = budget.limit > 0
        ? Math.round((monthlyExpenses / budget.limit) * 100)
        : 0;

    return {
        hasBudget: true,
        month: currentMonth,
        limit: budget.limit,
        spent: monthlyExpenses,
        remaining: budget.limit - monthlyExpenses,
        percentageUsed
    };
}

function getBudgetWarning(budgetStatus) {
    if (!budgetStatus.hasBudget) {
        return null;
    }

    if (budgetStatus.percentageUsed >= 100) {
        return {
            type: "budget_limit_reached",
            message: "You have reached your monthly budget limit.",
            percentageUsed: budgetStatus.percentageUsed
        };
    }

    if (budgetStatus.percentageUsed >= 80) {
        return {
            type: "budget_warning",
            message: `Warning: You have used ${budgetStatus.percentageUsed}% of your monthly budget.`,
            percentageUsed: budgetStatus.percentageUsed
        };
    }

    return null;
}

module.exports = {
    getCurrentMonth,
    calculateBudgetStatus,
    getBudgetWarning
};