const UserDAO = require('../DAOs/UserDAO'); // Import User DAO
const { generateHash, verify } = require('../Utilities/bcryptUtil');
const jwt = require('jsonwebtoken'); // Import JWT at the top

class UserService {
    constructor() {
        this.userdao = new UserDAO(); // Create an instance of UserDAO
    }

    async create(req) {
        try {
            req.body.password = await generateHash(req.body.password);
            return await this.userdao.create(req);
        } catch (ex) {
            console.error(ex);
            throw new Error('Error creating user');
        }
    }

    async authenticate(req) {
        try {
            const result = await this.userdao.getByEmail(req);
            if (!result || !result.success || !result.data) {
                return { success: false, message: 'User not found' };
            }

            const isMatch = await verify(req.body.password, result.data.password);
            if (!isMatch) {
                return { success: false, message: 'Password does not match' };
            }

            // Debug log
            console.log('Authentication successful for user:', result.data);

            const user_agent = req.header("user-agent");
            const isBrowser = user_agent &&
                (user_agent.includes('Mozilla') ||
                    user_agent.includes('Chrome') ||
                    user_agent.includes('Safari') ||
                    user_agent.includes('Firefox'));

            if (isBrowser) {
                // Check if user is admin
                const isAdmin = result.data.is_admin === 1;

                // Make sure the user object has all the necessary properties
                req.session.user = {
                    id: result.data.id,
                    email: result.data.email,
                    fn: result.data.fn,
                    sn: result.data.sn,
                    is_admin: isAdmin
                };
                req.session.isAuthenticated = true;

                // Return the user data as part of the result
                return {
                    success: true,
                    message: "Authenticated",
                    data: {
                        id: result.data.id,
                        email: result.data.email,
                        fn: result.data.fn,
                        sn: result.data.sn,
                        is_admin: isAdmin
                    }
                };
            } else {
                const token = jwt.sign(
                    {
                        id: result.data.id,
                        email: result.data.email,
                        is_admin: result.data.is_admin === 1
                    },
                    process.env.JWT_SECRET || 'my_secret-santa',
                    { expiresIn: '1d' }
                );

                return {
                    success: true,
                    message: 'Authenticated',
                    token: token,
                    data: {
                        id: result.data.id,
                        email: result.data.email,
                        fn: result.data.fn,
                        sn: result.data.sn,
                        name: `${result.data.fn} ${result.data.sn}`,
                        is_admin: result.data.is_admin === 1
                    }
                };
            }
        } catch (ex) {
            console.error('Authentication error:', ex);
            throw new Error('Authentication error');
        }
    }

    // Get all users (for admin dashboard)
    async getAllUsers() {
        try {
            // Call the getAll method from UserDAO, assuming it exists
            return await this.userdao.getAll();
        } catch (error) {
            console.error('Error getting all users:', error);
            return { success: false, error: 'Failed to get all users' };
        }
    }
}

module.exports = UserService;
