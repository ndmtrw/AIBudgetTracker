const db = require("../database/db");

function mapBudget(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        month: row.month,
        limit: row.limit_amount,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function getBudgetByUserAndMonth(userId, month) {
    return mapBudget(db.prepare("SELECT * FROM budgets WHERE user_id = ? AND month = ?").get(userId, month));
}

function upsertBudget(budget) {
    db.prepare(`
        INSERT INTO budgets (id, user_id, month, limit_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, month) DO UPDATE SET
            limit_amount = excluded.limit_amount,
            updated_at = excluded.updated_at
    `).run(
        budget.id,
        budget.userId,
        budget.month,
        budget.limit,
        budget.createdAt,
        budget.updatedAt
    );

    return getBudgetByUserAndMonth(budget.userId, budget.month);
}

module.exports = {
    getBudgetByUserAndMonth,
    upsertBudget
};