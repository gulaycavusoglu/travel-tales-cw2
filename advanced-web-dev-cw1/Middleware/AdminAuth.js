/**
 * AdminAuth middleware
 * This middleware checks if the user is authenticated as an admin
 * and redirects to the login page if not
 */
function AdminAuth(req, res, next) {
    // Check if admin session exists and is authenticated
    if (req.session && req.session.admin && req.session.admin.isAdmin) {
        return next();
    }

    // If not authenticated, redirect to login page
    return res.redirect('/login');
}

module.exports = AdminAuth;