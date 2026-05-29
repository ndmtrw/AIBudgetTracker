const db = require("../database/db");

function mapSuggestion(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        amount: row.amount,
        text: row.text,
        createdAt: row.created_at
    };
}

function createSuggestions(suggestions) {
    const insert = db.prepare(`
        INSERT INTO suggestions (id, user_id, category, amount, text, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
        for (const suggestion of items) {
            insert.run(
                suggestion.id,
                suggestion.userId,
                suggestion.category,
                suggestion.amount,
                suggestion.text,
                suggestion.createdAt
            );
        }
    });

    insertMany(suggestions);

    return suggestions;
}

function getSuggestionsByUser(userId) {
    return db.prepare(`
        SELECT *
        FROM suggestions
        WHERE user_id = ?
        ORDER BY created_at DESC
    `)
        .all(userId)
        .map(mapSuggestion);
}

function countSuggestions() {
    return db.prepare(`
        SELECT COUNT(*) AS count
        FROM suggestions
    `).get().count;
}

module.exports = {
    createSuggestions,
    getSuggestionsByUser,
    countSuggestions
};