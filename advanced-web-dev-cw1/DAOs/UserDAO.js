const pool = require('../Database/SQLConnection');

class UserDAO {
    constructor() {}


async create(req) {
    const { email, password, fn, sn } = req.body;
    const query = 'INSERT INTO users (email, password, fn, sn, is_admin) VALUES (?, ?, ?, ?, ?)';
    const values = [email, password, fn, sn, 0];

    return await new Promise((resolve) => {
        pool.run(query, values, () => {
            resolve({ success: true, message: 'User successfully registered' });
        });
    });
}


// Get user by email
async getByEmail(req) {
    const { email } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';

    return await new Promise((resolve) => {
        pool.get(query, [email], (err, row) => {
            resolve({ success: true, data: row });
        });
    });
}
// Get all users
async getAll() {
    const query = 'SELECT id, email, fn, sn, is_admin FROM users ORDER BY id ASC';

    return await new Promise((resolve) => {
        pool.all(query, [], (err, rows) => {
            resolve({ success: true, data: rows });
        });
    });
}
}

module.exports = UserDAO;
