const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get all countries from microservice for dropdown
router.get('/api/countries', async (req, res) => {
    try {
        const API_KEY = process.env.CW1_API_KEY || 'demo-api-key';
        // Use country info as the hostname when running in Docker
        const baseUrl = 'http://country-info:7000/api/v3.1/all';
        
        console.log('Fetching countries from:', baseUrl);
            
        const response = await axios.get(baseUrl, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });
        
        if (response.data && response.data.success) {
            res.json(response.data);
        } else {
            res.status(404).json({ success: false, error: 'Countries not found' });
        }
    } catch (err) {
        console.error('Error fetching countries list:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch countries list' });
    }
});

// Proxy endpoint to get country details from microservice
router.get('/api/country-details', async (req, res) => {
    const countryName = req.query.name;
    if (!countryName) {
        return res.status(400).json({ success: false, error: 'Country name is required' });
    }
    try {
        const API_KEY = process.env.CW1_API_KEY || 'demo-api-key';
        // Use country-info as the hostname when running in Docker
        const baseUrl = `http://country-info:7000/api/v3.1/name/${encodeURIComponent(countryName)}`;
            
        console.log('Fetching country details from:', baseUrl);
        
        const response = await axios.get(baseUrl, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });
        
        if (response.data && response.data.success && response.data.data) {
            const c = response.data.data;
            // Extract currency name (first key)
            let currency = 'N/A';
            if (c.currencies && typeof c.currencies === 'object') {
                const keys = Object.keys(c.currencies);
                if (keys.length > 0) {
                    currency = c.currencies[keys[0]].name || keys[0];
                }
            }
            
            // Format languages as a string
            let languages = 'N/A';
            if (c.languages && typeof c.languages === 'object') {
                languages = Object.values(c.languages).join(', ');
            }
            
            res.json({
                success: true,
                data: {
                    name: c.name,
                    flag: c.flags,
                    capital: c.capital,
                    currency,
                    languages
                }
            });
        } else {
            res.status(404).json({ success: false, error: 'Country not found' });
        }
    } catch (err) {
        console.error('Error fetching country details:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch country details' });
    }
});

// Country details page - uses the microservice instead of local database
router.get('/country/:name', async (req, res) => {
    const countryName = req.params.name;
    
    try {
        const API_KEY = process.env.CW1_API_KEY || 'demo-api-key';
        // Use country-info as the hostname when running in Docker
        const baseUrl = `http://country-info:7000/api/v3.1/name/${encodeURIComponent(countryName)}`;
            
        console.log('Fetching country details for page:', baseUrl);
        
        const response = await axios.get(baseUrl, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });
        
        if (response.data && response.data.success && response.data.data) {
            const c = response.data.data;
            
            // Format languages as a JSON string to match the expected format in the template
            let spokenLanguages = '{}';
            if (c.languages && typeof c.languages === 'object') {
                spokenLanguages = JSON.stringify(c.languages);
            }
            
            // Prepare the country data in a format expected by the template
            const countryData = {
                name: c.name,
                flag: c.flags,
                capital: c.capital,
                ctry_code: c.cca2,
                spoken_languages: spokenLanguages
            };
            
            res.render('countryDetails', { 
                country: countryData,
                user: req.session.user
            });
        } else {
            res.status(404).render('error', { message: 'Country not found' });
        }
    } catch (err) {
        console.error('Error loading country details page:', err.message);
        res.status(500).render('error', { message: 'Failed to load country details' });
    }
});

module.exports = router; 