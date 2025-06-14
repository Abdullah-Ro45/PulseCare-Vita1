// backend/server.js
const express = require('express');
const cors = require('cors'); // Import cors middleware
require('dotenv').config(); // Load environment variables from .env

// Import route handlers
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const mealRoutes = require('./routes/meal');
const activityRoutes = require('./routes/activity');
const reminderRoutes = require('./routes/reminders');
const exerciseRoutes = require('./routes/exercises');
const wellnessRoutes = require('./routes/wellness'); // <-- ADD THIS LINE


const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust in production)
app.use(express.json()); // Parse JSON request bodies

// Route handlers
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/profile', profileRoutes); // User profile routes
app.use('/api/meals', mealRoutes); // Meal tracking routes
app.use('/api/activities', activityRoutes); // Activity tracking routes
app.use('/api/reminders', reminderRoutes); // Reminder routes
app.use('/api/exercises', exerciseRoutes); // Exercises routes
app.use('/api/wellness', wellnessRoutes); // <-- ADD THIS LINE


// Basic root route
app.get('/', (req, res) => {
    res.send('Fitness Tracker API is running!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
