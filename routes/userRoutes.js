const express = require('express');
const router = express.Router();
const UserService = require('../Services/userService');
const userService = new UserService();
const { authenticate, isAuthenticated } = require('../Utilities/authMiddleware');

// Registration route
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const result = await userService.create(req);

    if (!result.success) {
        return res.render('register', { error: result.error || 'Registration failed.' });
    }

    const email = req.body.email;
    const lookup = await userService.userdao.getByEmail({ body: { email } });

    if (!lookup.success || !lookup.data) {
        return res.redirect('/login');
    }

    const { id, name, surname } = { ...lookup.data, ...req.body };
    req.session.user = { id, email, name, surname };
    req.session.isAuthenticated = true;

    res.redirect('/');
});

// Login routes
router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    const result = await userService.authenticate(req);
    
    console.log('Login result success:', result.success);
    console.log('Session after login:', req.session);
    
    if (!result.success) {
        return res.render('login', { error: result.error || 'Authentication failed.' });
    }
    
    // If request is from API client with JSON Accept header
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    // Log before redirect
    console.log('Redirecting after successful login, session user:', req.session.user);
    console.log('Session authenticated:', req.session.isAuthenticated);
    
    // If browser client, redirect to home
    res.redirect('/');
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// User profile route
router.get('/profile', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    const user = await userService.getUserById(userId);
    
    if (!user.success) {
        return res.status(404).render('error', { message: 'User not found' });
    }
    
    const followers = await userService.getFollowers(userId);
    const following = await userService.getFollowing(userId);
    
    res.render('profile', { 
        user: user.data,
        followers: followers.success ? followers.data : [],
        following: following.success ? following.data : [],
        isFollowing: false,
        isCurrentUser: true
    });
});

// View another user's profile
router.get('/user/:id', async (req, res) => {
    const userId = req.params.id;
    const user = await userService.getUserById(userId);
    
    if (!user.success) {
        return res.status(404).render('error', { message: 'User not found' });
    }
    
    const followers = await userService.getFollowers(userId);
    const following = await userService.getFollowing(userId);
    
    // Check if current user is following this user
    let isFollowing = false;
    if (req.session.user) {
        const currentUserFollowing = await userService.getFollowing(req.session.user.id);
        if (currentUserFollowing.success) {
            isFollowing = currentUserFollowing.data.some(f => f.id === parseInt(userId));
        }
    }
    
    res.render('profile', { 
        user: user.data,
        followers: followers.success ? followers.data : [],
        following: following.success ? following.data : [],
        isFollowing,
        isCurrentUser: req.session.user && req.session.user.id === parseInt(userId)
    });
});

// Follow user
router.post('/user/:id/follow', authenticate, async (req, res) => {
    const followedId = parseInt(req.params.id);
    const followerId = req.session.user ? req.session.user.id : req.user.id;
    
    if (followerId === followedId) {
        return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }
    
    const result = await userService.followUser(followerId, followedId);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(result);
    }
    
    if (result.success) {
        return res.redirect(`/user/${followedId}`);
    } else {
        return res.status(400).render('error', { message: result.error || 'Failed to follow user' });
    }

});

module.exports = router; 