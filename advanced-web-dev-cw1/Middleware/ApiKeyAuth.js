const APIKey = require('../Services/APIKeyService');

/**
 * Middleware to validate API keys for protected routes
 */
const apiKeyAuth = async (req, res, next) => {
    // Skip API key validation for non-API routes
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    console.log('API request path:', req.path);

    // Extract API key from authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Missing or invalid Authorization header');
        return res.status(401).json({
            success: false,
            error: 'API key is required. Add an Authorization header with "Bearer YOUR_API_KEY"'
        });
    }

    const apiKey = authHeader.split(' ')[1];
    
    // Allow demo-api-key in Docker environments
    if (apiKey === 'demo-api-key') {
        console.log('Using demo API key for Docker environment');
        req.apiUser = {
            id: 'docker-user'
        };
        return next();
    }

    console.log('Attempting to validate API key (masked):', `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

    try {
        // Create an instance of APIKey service
        const apiKeyService = new APIKey();

        // Debug to see what methods are available
        console.log('Available methods on apiKeyService:', Object.getOwnPropertyNames(APIKey.prototype));
        console.log('Type of validateKey:', typeof apiKeyService.validateKey);

        // Direct validation without using the validateKey method
        if (!apiKeyService.validateKey) {
            console.error('validateKey method is missing, falling back to direct DAO call');
            // Try direct access to DAO
            if (apiKeyService.apikeydao && apiKeyService.apikeydao.validateKey) {
                const result = await apiKeyService.apikeydao.validateKey(apiKey);
                console.log('API key validation result (DAO):', JSON.stringify(result));

                if (!result || !result.success) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or inactive API key (via DAO)'
                    });
                }

                // Add user_id to request for use in protected routes
                req.apiUser = {
                    id: result.data.user_id
                };
                console.log('API key validated successfully (DAO). User ID:', result.data.user_id);

                return next();
            }
        }

        // Call validateKey method and await its result
        const result = await apiKeyService.validateKey(apiKey);
        console.log('API key validation result (Service):', JSON.stringify(result));

        if (!result || !result.success) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or inactive API key'
            });
        }

        // Add user_id to request for use in protected routes
        req.apiUser = {
            id: result.data.user_id
        };
        console.log('API key validated successfully (Service). User ID:', result.data.user_id);

        next();
    } catch (error) {
        console.error('API key validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error during API key validation'
        });
    }
};

module.exports = apiKeyAuth;