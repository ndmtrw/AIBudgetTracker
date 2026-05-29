const db = require("../database/db");

function mapTransaction(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        amount: row.amount,
        category: row.category,
        description: row.description,
        date: row.date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function createTransaction(transaction) {
    db.prepare(`
        INSERT INTO transactions (id, user_id, type, amount, category, description, date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        transaction.id,
        transaction.userId,
        transaction.type,
        transaction.amount,
        transaction.category,
        transaction.description,
        transaction.date,
        transaction.createdAt,
        transaction.updatedAt || null
    );

    return getTransactionByIdForUser(transaction.id, transaction.userId);
}

function getTransactionsByUser(userId) {
    return db.prepare(`
        SELECT *
        FROM transactions
        WHERE user_id = ?
        ORDER BY date DESC, created_at DESC
    `)
        .all(userId)
        .map(mapTransaction);
}

function getTransactionByIdForUser(id, userId) {
    return mapTransaction(
        db.prepare(`
            SELECT *
            FROM transactions
            WHERE id = ? AND user_id = ?
        `).get(id, userId)
    );
}

function updateTransaction(id, userId, changes) {
    const current = getTransactionByIdForUser(id, userId);

    if (!current) {
        return null;
    }

    const updated = {
        type: changes.type || current.type,
        amount: changes.amount !== undefined ? Number(changes.amount) : current.amount,
        category: changes.category || current.category,
        description: changes.description !== undefined ? changes.description : current.description,
        date: changes.date || current.date,
        updatedAt: new Date().toISOString()
    };

    db.prepare(`
        UPDATE transactions
        SET type = ?, amount = ?, category = ?, description = ?, date = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
    `).run(
        updated.type,
        updated.amount,
        updated.category,
        updated.description,
        updated.date,
        updated.updatedAt,
        id,
        userId
    );

    return getTransactionByIdForUser(id, userId);
}

function deleteTransaction(id, userId) {
    const result = db.prepare(`
        DELETE FROM transactions
        WHERE id = ? AND user_id = ?
    `).run(id, userId);

    return result.changes > 0;
}

function countTransactions() {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM transactions
    `).get().count;
}

function getMostUsedCategory() {
    const row = db.prepare(`
        SELECT category, COUNT(*) AS count
        FROM transactions
        GROUP BY category
        ORDER BY count DESC, category ASC
        LIMIT 1
    `).get();

    return row ? row.category : null;
}

module.exports = {
    createTransaction,
    getTransactionsByUser,
    getTransactionByIdForUser,
    updateTransaction,
    deleteTransaction,
    countTransactions,
    getMostUsedCategory
};