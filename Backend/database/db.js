const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const databaseDirectory = __dirname;
const databasePath = path.join(databaseDirectory, "budget_tracker.db");
const schemaPath = path.join(databaseDirectory, "schema.sql");

if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
}

const db = new Database(databasePath);
const schema = fs.readFileSync(schemaPath, "utf-8");

db.pragma("foreign_keys = ON");
db.exec(schema);

module.exports = db;