const express = require('express');
const session = require('express-session');
const apiKeyAuth = require('./Middleware/ApiKeyAuth');
const UserService = require('./Services/userService');
const APIKey = require('./Services/APIKeyService');
const app = express();
const axios = require('axios');

app.set('view engine', 'ejs');
app.set('views', './ui');

// Set up session middleware
app.use(session({
    secret: 'gyulay-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Apply API key middleware to all routes
app.use(apiKeyAuth);

app.get('/', (req, res) => {
    res.render('landing'); // This will render views/ui/landing.ejs
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const userService = new UserService();
    const result = await userService.create(req);

    if (!result.success) {
        return res.render('register', { error: 'Registration failed.' });
    }

    const email = req.body.email;
    const lookup = await userService.userdao.getByEmail({ body: { email } });

    if (!lookup.success || !lookup.data) {
        return res.redirect('/login');
    }

    const { id, fn, sn } = { ...lookup.data, ...req.body };
    req.session.user = { id, email, fn, sn };
    req.session.isAuthenticated = true;

    res.render('home', { data: { fn, sn } });
});


app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const userService = new UserService();
    const result = await userService.authenticate(req);

    if (result.success) {
        // Set user session
        req.session.user = result.data || { fn: result.data?.fn, sn: result.data?.sn };
        req.session.isAuthenticated = true;
        
        // Debug log
        console.log('Login successful, session user data:', req.session.user);
        
        // Redirect to home
        res.redirect('/home');
    } else {
        res.render('login', { error: result.message });
    }
});

// Add GET route for /home
app.get('/home', async (req, res) => {
    // Check if user is authenticated
    if (req.session.isAuthenticated && req.session.user) {
        // No need to get API keys, since users can only have one key and can't see it
        res.render('home', { 
            data: req.session.user
        });
    } else {
        res.redirect('/login');
    }
});

app.post('/generate-api-key', async (req, res) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.redirect('/login');
    }

    const apiKeyService = new APIKey();
    const result = await apiKeyService.create(req);

    res.render('home', {
        data: req.session.user,
        newApiKey: result.success ? result.data.api_key : null,
        apiKeyMessage: {
            success: result.success,
            message: result.success ? 'API key generated successfully!' : 'Failed to generate API key'
        }
    });
});


// Middleware to check if user is an admin
const checkAdminAccess = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.is_admin) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/admin', checkAdminAccess, async (req, res) => {
    const userService = new UserService();
    const apiKeyService = new APIKey();

    const usersResult = await userService.getAllUsers();
    const allApiKeysResult = await apiKeyService.getAllKeys();

    res.render('admin-dashboard', {
        data: req.session.user,
        users: usersResult.data,
        allApiKeys: allApiKeysResult.data
    });
});

// Deactivate API key (admin)
app.post('/admin/deactivate-key', checkAdminAccess, async (req, res) => {
    try {
        const { keyId } = req.body;
        const apiKeyService = new APIKey();

        // Deactivate the key
        const result = await apiKeyService.adminDeactivateKey(keyId);
// console.log(userId)
//         // Redirect back to the appropriate page
//         if (userId) {
//             res.redirect(`/admin/user-keys/${userId}?success=${result.success}&message=${encodeURIComponent(result.success ? 'API key deactivated successfully' : result.error)}`);
//         } else {
            res.redirect(`/admin?success=${result.success}&message=${encodeURIComponent(result.success ? 'API key deactivated successfully' : result.error)}`);
        // }
    } catch (error) {
        console.error('Deactivate API key error:', error);
        res.redirect('/admin?success=false&message=' + encodeURIComponent('Failed to deactivate API key'));
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

app.get('/api/v3.1/all', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all');
    const countries = response.data.map(c => ({
      name: c.name?.common || 'N/A',
      flag: c.flags?.png || ''
    })).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    
    res.json({ success: true, data: countries });
  } catch (error) {
    console.error(`Error fetching all countries: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch countries' });
  }
});

app.get('/api/v3.1/*', async (req, res) => {
  try {
    const dynamicPath = req.params[0];
    console.log(dynamicPath);

    let restCountriesUrl = `https://restcountries.com/v3.1/${dynamicPath}`;
    console.log(restCountriesUrl);

    const response = await axios.get(restCountriesUrl);

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    const country = response.data[0];

    const result = {
      name: country.name?.common || 'N/A',
      capital: country.capital?.[0] || 'N/A',
      flags: country.flags?.png || 'N/A',
      languages: country.languages || {},
      currencies: country.currencies || {}
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch data' });
  }
});


app.listen(7000, () => {
    console.log('Server running on port 7000');
});
