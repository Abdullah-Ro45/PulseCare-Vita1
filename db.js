// backend/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env

// Create a connection pool for efficient database connections
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE, // Use DB_DATABASE from .env
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0 // Maximum number of requests the pool will queue
});

// Test the database connection on startup
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err);
        // Exit process if database connection fails, as the app can't function
        process.exit(1);
    });

module.exports = pool; // Export the connection pool for use in routes
