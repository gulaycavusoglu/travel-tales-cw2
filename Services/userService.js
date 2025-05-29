const UserDAO = require('../DAOs/userDAO');
const { generateHash, verify } = require('../Utilities/bcryptUtil');
const jwt = require('jsonwebtoken');
const { createResponse } = require('../Utilities/createResponse');
const pool = require('../Database/dbManagement');

// JWT secret should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'travel-tales-docker-jwt-secret';
const JWT_EXPIRY = '1d';

class UserService {
    constructor() {
        this.userdao = new UserDAO();
    }

    async create(req) {
        try {
            // Validate email uniqueness
            const existingUser = await this.userdao.getByEmail(req);
            if (existingUser.success && existingUser.data) {
                return createResponse(false, null, 'Email already in use');
            }

            // Hash password
            req.body.password = await generateHash(req.body.password);
            
            // Create user
            const result = await this.userdao.create(req);
            return result;
        } catch (ex) {
            console.error('Error creating user:', ex);
            return createResponse(false, null, ex);
        }
    }

    async authenticate(req) {
        try {
            const result = await this.userdao.getByEmail(req);
            
            if (!result.success || !result.data) {
                return createResponse(false, null, 'User not found');
            }
            
            const isMatch = await verify(req.body.password, result.data.password);
            
            if (isMatch) {
                // Check if request is from API client with explicit API header
                // Otherwise assume it's a browser/web request
                if (req.headers['x-api-client']) {
                    // Return JWT for API clients
                    const payload = {
                        id: result.data.id,
                        name: result.data.name,
                        surname: result.data.surname,
                        email: result.data.email
                    };
                    
                    const token = jwt.sign(
                        payload,
                        JWT_SECRET,
                        { expiresIn: JWT_EXPIRY }
                    );

                    return createResponse(true, {
                        message: 'Authenticated',
                        token,
                        user: {
                            id: result.data.id,
                            name: result.data.name,
                            surname: result.data.surname,
                            email: result.data.email
                        }
                    });
                } else {
                    // Always set session for web requests
                    console.log('Setting session for web request:', result.data.id);
                    req.session.user = {
                        id: result.data.id,
                        name: result.data.name,
                        surname: result.data.surname,
                        email: result.data.email,
                    };
                    req.session.isAuthenticated = true;
                    return createResponse(true, { 
                        message: "Authenticated",
                        user: {
                            id: result.data.id,
                            name: result.data.name,
                            surname: result.data.surname,
                            email: result.data.email
                        }
                    });
                }
            } else {
                return createResponse(false, null, 'Incorrect password');
            }
        } catch (ex) {
            console.error('Authentication error:', ex);
            return createResponse(false, null, ex);
        }
    }

    async getUserById(userId) {
        try {
            // Direct database query since getById was removed from DAO
            return new Promise((resolve, reject) => {
                pool.get('SELECT id, name, surname, email FROM users WHERE id = ?', [userId], (err, row) => {
                    if(err) {
                        reject(createResponse(false, null, err));
                        return;
                    }
                    if(!row) {
                        resolve(createResponse(false, null, 'User not found'));
                        return;
                    }
                    resolve(createResponse(true, row));
                });
            });
        } catch (ex) {
            console.error('Error fetching user:', ex);
            return createResponse(false, null, ex);
        }
    }

    async getFollowers(userId) {
        try {
            const result = await this.userdao.getFollowers(userId);
            return result;
        } catch (ex) {
            console.error('Error fetching followers:', ex);
            return createResponse(false, null, ex);
        }
    }

    async getFollowing(userId) {
        try {
            const result = await this.userdao.getFollowing(userId);
            return result;
        } catch (ex) {
            console.error('Error fetching following:', ex);
            return createResponse(false, null, ex);
        }
    }

    async followUser(followerId, followedId) {
        try {
            if (followerId === followedId) {
                return createResponse(false, null, 'Cannot follow yourself');
            }
            
            const result = await this.userdao.followUser(followerId, followedId);
            return result;
        } catch (ex) {
            console.error('Error following user:', ex);
            return createResponse(false, null, ex);
        }
    }

    // Verify JWT token for API authentication
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return createResponse(true, decoded);
        } catch (ex) {
            console.error('JWT verification error:', ex);
            return createResponse(false, null, 'Invalid token');
        }
    }
}

module.exports = UserService;