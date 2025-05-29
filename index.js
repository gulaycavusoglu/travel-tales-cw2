require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const methodOverride = require('method-override');

// Database and seed
require('./Database/dbManagement');

// Routes
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const countryRoutes = require('./routes/countryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './UI');

// Configure CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session middleware
app.use(session({
    secret: process.env.JWT_SECRET || 'travel-tales-docker-jwt-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true only in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax' // Helps with CSRF protection
    }
}));

// Log session config
console.log('Session configured with JWT secret:', process.env.JWT_SECRET ? '[SECRET SET]' : 'default secret');

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE in forms
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Routes
app.use('/', blogRoutes); // Blog routes handle the homepage
app.use('/', userRoutes);
app.use('/', countryRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});