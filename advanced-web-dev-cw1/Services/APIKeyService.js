const { v4: uuidv4 } = require('uuid');
const APIKeyDAO = require('../DAOs/APIKeyDAO');

class APIKey {
    constructor() {
        this.apikeydao = new APIKeyDAO();
    }

    async create(req) {
        const userId = req.session?.user?.id;
        if (!userId) return { success: false };

        const apiKey = uuidv4();
        return await this.apikeydao.create(userId, apiKey);
    }

    async validateKey(apiKey) {
        return await this.apikeydao.validateKey(apiKey);
    }

    async getAllKeys() {
        return await this.apikeydao.getAllKeys();
    }

    async adminDeactivateKey(keyId) {
        return await this.apikeydao.adminDeactivateKey(keyId);
    }
}

module.exports = APIKey;
