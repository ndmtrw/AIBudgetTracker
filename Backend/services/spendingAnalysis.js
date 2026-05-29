function calculateTotalExpenses(transactions) {
    return transactions
        .filter(x => x.type === "expense")
        .reduce((sum, x) => sum + Number(x.amount), 0);
}

function calculateTotalIncome(transactions) {
    return transactions
        .filter(x => x.type === "income")
        .reduce((sum, x) => sum + Number(x.amount), 0);
}

function calculateCategoryTotals(transactions) {
    const categoryTotals = {};

    transactions
        .filter(x => x.type === "expense")
        .forEach(x => {
            if (!categoryTotals[x.category]) {
                categoryTotals[x.category] = 0;
            }

            categoryTotals[x.category] += Number(x.amount);
        });

    return categoryTotals;
}

function calculateCategoryPercentages(transactions) {
    const totalExpenses = calculateTotalExpenses(transactions);
    const categoryTotals = calculateCategoryTotals(transactions);

    return Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses === 0 ? 0 : Math.round((amount / totalExpenses) * 100)
    })).sort((a, b) => b.amount - a.amount);
}

function findBiggestSpendingCategory(transactions) {
    const categoryTotals = calculateCategoryTotals(transactions);

    let biggestCategory = null;
    let biggestAmount = 0;

    Object.entries(categoryTotals).forEach(([category, amount]) => {
        if (amount > biggestAmount) {
            biggestCategory = category;
            biggestAmount = amount;
        }
    });

    return {
        category: biggestCategory,
        amount: biggestAmount
    };
}

function detectUnusualSpending(userId, newTransaction, allTransactions) {
    if (newTransaction.type !== "expense") {
        return null;
    }

    const previousTransactions = allTransactions.filter(x =>
        x.userId === userId &&
        x.type === "expense" &&
        x.category === newTransaction.category &&
        x.id !== newTransaction.id
    );

    if (previousTransactions.length < 3) {
        return null;
    }

    const average = previousTransactions.reduce((sum, x) => {
        return sum + Number(x.amount);
    }, 0) / previousTransactions.length;

    const currentAmount = Number(newTransaction.amount);

    if (currentAmount >= average * 2) {
        return {
            type: "unusual_spending_alert",
            title: "Unusual spending detected",
            message: `Unusual spending detected in ${newTransaction.category}. This expense is much higher than your average.`,
            level: "warning",
            category: newTransaction.category,
            amount: currentAmount,
            average: Math.round(average)
        };
    }

    return null;
}

function getSpendingRiskScore(transactions, monthlyBudget) {
    const totalExpenses = calculateTotalExpenses(transactions);

    if (!monthlyBudget || monthlyBudget <= 0) {
        return {
            score: 0,
            level: "unknown",
            message: "No monthly budget is set."
        };
    }

    const percentageUsed = Math.round((totalExpenses / monthlyBudget) * 100);

    if (percentageUsed >= 100) {
        return {
            score: 100,
            level: "critical",
            message: "You have reached or passed your monthly budget."
        };
    }

    if (percentageUsed >= 90) {
        return {
            score: 90,
            level: "high",
            message: "You are very close to your monthly budget limit."
        };
    }

    if (percentageUsed >= 80) {
        return {
            score: 80,
            level: "medium",
            message: "You have used most of your monthly budget."
        };
    }

    return {
        score: percentageUsed,
        level: "low",
        message: "Your budget usage is still safe."
    };
}

function generateSpendingInsights(userId, transactions, monthlyBudget) {
    const userTransactions = transactions.filter(x => x.userId === userId);

    const totalIncome = calculateTotalIncome(userTransactions);
    const totalExpenses = calculateTotalExpenses(userTransactions);
    const categoryPercentages = calculateCategoryPercentages(userTransactions);
    const biggestCategory = findBiggestSpendingCategory(userTransactions);
    const risk = getSpendingRiskScore(userTransactions, monthlyBudget);

    const insights = [];

    if (totalIncome > 0 && totalExpenses > totalIncome * 0.7) {
        insights.push("Your expenses are more than 70% of your income. Try to reduce non-essential spending.");
    }

    if (categoryPercentages.length > 0 && categoryPercentages[0].percentage >= 40) {
        insights.push(`${categoryPercentages[0].category} takes ${categoryPercentages[0].percentage}% of your expenses. This is your first category to review.`);
    }

    if (risk.level === "critical" || risk.level === "high") {
        insights.push(risk.message);
    }

    if (insights.length === 0) {
        insights.push("Your spending pattern looks stable based on the current data.");
    }

    return {
        totalIncome,
        totalExpenses,
        biggestCategory,
        categoryPercentages,
        risk,
        insights
    };
}

module.exports = {
    calculateTotalExpenses,
    calculateTotalIncome,
    calculateCategoryTotals,
    calculateCategoryPercentages,
    findBiggestSpendingCategory,
    detectUnusualSpending,
    getSpendingRiskScore,
    generateSpendingInsights
};