// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    // Get token from Authorization header (Bearer TOKEN)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token after 'Bearer'

    if (!token) {
        // If no token is provided, return 401 Unauthorized
        return res.status(401).json({ message: 'Access Denied: No token provided.' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // If token is invalid or expired, return 403 Forbidden
            return res.status(403).json({ message: 'Access Denied: Invalid or expired token.' });
        }
        // If token is valid, attach the user payload to the request object
        req.user = user;
        // Proceed to the next middleware or route handler
        next();
    });
};

module.exports = authenticateToken;
