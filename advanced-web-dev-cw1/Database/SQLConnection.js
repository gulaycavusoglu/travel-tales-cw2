const db = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/restCountries.db');
// Create an SQLite database connection
const pool = new db.Database(dbPath, (err) => {
    if (err) {
        console.error('Connection failed:', err.message);
    } else {
        console.log(`✅ Connected to SQLite Database: ${dbPath}`);
    }
});

// Export the connection
module.exports = pool;
