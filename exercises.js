// backend/routes/exercises.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// --- API to get all exercises ---
// Protected route: requires a valid JWT
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Fetch all exercises from the exercises table
        const [exercises] = await pool.query(
            'SELECT id, name, category, level, goal, muscle_group, equipment_needed, common_mistakes, youtube_link FROM exercises ORDER BY name ASC'
        );

        res.status(200).json(exercises);

    } catch (error) {
        console.error('Error fetching exercises:', error);
        res.status(500).json({ message: 'Server error while fetching exercises.' });
    }
});

// --- API to get exercises by category, level, or search term (Optional - can add later) ---
/*
router.get('/filter', authenticateToken, async (req, res) => {
    const { category, level, q } = req.query; // Get filter/search parameters

    let query = 'SELECT id, name, category, level, goal, muscle_group, equipment_needed, common_mistakes, youtube_link FROM exercises WHERE 1=1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }
    if (level) {
        query += ' AND level = ?';
        params.push(level);
    }
    if (q) {
        query += ' AND (name LIKE ? OR muscle_group LIKE ? OR equipment_needed LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`); // Search in name, muscle_group, equipment
    }

    query += ' ORDER BY name ASC';

    try {
        const [exercises] = await pool.query(query, params);
        res.status(200).json(exercises);
    } catch (error) {
        console.error('Error filtering exercises:', error);
        res.status(500).json({ message: 'Server error while filtering exercises.' });
    }
});
*/


module.exports = router;
