// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');


// Create or open the SQLite database
const dbPath = path.join(__dirname, '../data/travel_tales.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('DB connection error:', err.message);
    console.log('Connected to travel_tales database at:', dbPath);
});

// Create tables if they don't exist
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    `, (err) => {
        if (err) return console.error('Users table creation error:', err.message);
        console.log('Users table is ready.');
    });

    // Blog Posts table
    db.run(`
        CREATE TABLE IF NOT EXISTS blogPost (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            date_of_visit TEXT NOT NULL,
            country_name TEXT NOT NULL,
            date_visited TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) return console.error('BlogPost table creation error:', err.message);
        console.log('BlogPost table is ready.');
    });

    // Comments table
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blog_post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (blog_post_id) REFERENCES blogPost(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) return console.error('Comments table creation error:', err.message);
        console.log('Comments table is ready.');
    });

    // Likes table
    db.run(`
        CREATE TABLE IF NOT EXISTS likedPosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            blog_post_id INTEGER NOT NULL,
            is_like BOOLEAN NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (blog_post_id) REFERENCES blogPost(id),
            UNIQUE(user_id, blog_post_id)
        )
    `, (err) => {
        if (err) return console.error('LikedPosts table creation error:', err.message);
        console.log('LikedPosts table is ready.');
    });

    // Follows table
    db.run(`
        CREATE TABLE IF NOT EXISTS follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            followed_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (follower_id) REFERENCES users(id),
            FOREIGN KEY (followed_id) REFERENCES users(id),
            UNIQUE(follower_id, followed_id)
        )
    `, (err) => {
        if (err) return console.error('Follows table creation error:', err.message);
        console.log('Follows table is ready.');
    });
});

module.exports = db;
