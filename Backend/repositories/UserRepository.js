const db = require("../database/db");

function mapUser(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at
    };
}

function getAllUsers() {
    return db.prepare("SELECT * FROM users ORDER BY created_at ASC").all().map(mapUser);
}

function getUserById(id) {
    return mapUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function findUserByEmail(email) {
    return mapUser(db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email));
}

function createUser(user) {
    db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        user.id,
        user.username,
        user.email,
        user.passwordHash,
        user.role,
        user.createdAt
    );

    return findUserByEmail(user.email);
}

function countUsers() {
    return db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
}

module.exports = {
    getAllUsers,
    getUserById,
    findUserByEmail,
    createUser,
    countUsers
};