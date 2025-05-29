const UserService = require('../Services/userService');
const userService = new UserService();
const pool = require('../Database/dbManagement');
const { createResponse } = require('./createResponse');

/**
 * Middleware to check if user is authenticated via session (for browser clients)
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    
    // For API returns JSON response
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    
    // For browser redirects to login
    return res.redirect('/login');
};

/**
 * Middleware to check if user is authenticated via JWT (for API clients)
 */
const verifyJWT = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            error: 'No token provided' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const result = userService.verifyToken(token);
    
    if (!result.success) {
        return res.status(401).json({ 
            success: false, 
            error: result.error 
        });
    }
    
    // Add user info to request
    req.user = result.data;
    next();
};

/**
 * Unified authentication middleware that works for both session and JWT
 */
const authenticate = (req, res, next) => {
    // First check session
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    
    // Then check JWT
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const result = userService.verifyToken(token);
        
        if (result.success) {
            req.user = result.data;
            return next();
        }
    }
    
    // Authentication failed
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    
    return res.redirect('/login');
};

/**
 * Middleware to check if user owns a resource
 * resourceType: The type of resource (e.g., 'post', 'comment')
 * idParam: The parameter name in the URL that contains the resource ID
 */
const isResourceOwner = (resourceType, idParam) => {
    return async (req, res, next) => {
        const resourceId = req.params[idParam];
        const userId = req.session.user ? req.session.user.id : (req.user ? req.user.id : null);
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }
        
        let isOwner = false;
        
        try {
            switch (resourceType) {
                case 'post': {
                    // Direct database query instead of using blogDAO.getById
                    const result = await new Promise((resolve, reject) => {
                        pool.get('SELECT user_id FROM blogPost WHERE id = ?', [resourceId], (err, row) => {
                            if(err) {
                                reject(createResponse(false, null, err));
                                return;
                            }
                            if(!row) {
                                resolve(createResponse(false, null, 'Blog post not found'));
                                return;
                            }
                            resolve(createResponse(true, row));
                        });
                    });
                    isOwner = result.success && result.data && result.data.user_id === userId;
                    break;
                }
                case 'comment': {
                    // Direct database query instead of using commentDAO.getById
                    const result = await new Promise((resolve, reject) => {
                        pool.get('SELECT user_id FROM comments WHERE id = ?', [resourceId], (err, row) => {
                            if(err) {
                                reject(createResponse(false, null, err));
                                return;
                            }
                            if(!row) {
                                resolve(createResponse(false, null, 'Comment not found'));
                                return;
                            }
                            resolve(createResponse(true, row));
                        });
                    });
                    isOwner = result.success && result.data && result.data.user_id === userId;
                    break;
                }
                default:
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Invalid resource type' 
                    });
            }
            
            if (isOwner) {
                return next();
            }
            
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to perform this action' 
            });
            
        } catch (error) {
            console.error(`Error checking resource ownership:`, error);
            return res.status(500).json({ 
                success: false, 
                error: 'Server error' 
            });
        }
    };
};

module.exports = {
    isAuthenticated,
    verifyJWT,
    authenticate,
    isResourceOwner
}; 