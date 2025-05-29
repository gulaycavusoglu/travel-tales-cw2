const pool = require('../Database/SQLConnection');

class APIKeyDAO {
    constructor() {
    }

    async create(userId, apiKey) {
        const now = new Date().toISOString();
        const query = 'INSERT INTO api_key (user_id, api_key, created_at, is_active) VALUES (?, ?, ?, ?)';
        const values = [userId, apiKey, now, 1];

        return await new Promise((resolve) => {
            pool.run(query, values, function () {
                resolve({
                    success: true,
                    data: {
                        id: this.lastID,
                        api_key: apiKey,
                        created_at: now
                    }
                });
            });
        });
    }

    async validateKey(apiKey) {
        const query = 'SELECT user_id, id FROM api_key WHERE api_key = ? AND is_active = 1';

        return await new Promise((resolve) => {
            pool.get(query, [apiKey], (err, row) => {
                resolve({
                    success: !!row,
                    data: row || null
                });
            });
        });
    }

    async getAllKeys() {
        const query = `
            SELECT k.id,
                   k.api_key,
                   k.created_at,
                   k.is_active,
                   k.user_id,
                   u.email AS user_email,
                   u.fn    AS user_fn,
                   u.sn    AS user_sn
            FROM api_key k
                     JOIN users u ON k.user_id = u.id
            ORDER BY k.created_at DESC
        `;

        return await new Promise((resolve) => {
            pool.all(query, [], (err, rows) => {
                resolve({success: true, data: rows || []});
            });
        });
    }


    // Admin deactivate any API key
    async adminDeactivateKey(keyId) {
        const query = 'UPDATE api_key SET is_active = 0 WHERE id = ?';

        return await new Promise((resolve) => {
            pool.run(query, [keyId], function () {
                resolve({success: true});
            });
        });
    }
}

module.exports = APIKeyDAO;
