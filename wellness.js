// backend/routes/wellness.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// --- API to get all wellness videos ---
// Protected route: requires a valid JWT
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Fetch all wellness videos from the wellness_videos table
        const [videos] = await pool.query(
            'SELECT id, type, title, description, youtube_link FROM wellness_videos ORDER BY type, title ASC'
        );

        res.status(200).json(videos);

    } catch (error) {
        console.error('Error fetching wellness videos:', error);
        res.status(500).json({ message: 'Server error while fetching wellness videos.' });
    }
});

// --- API to get wellness videos by type (Optional - can add later) ---
/*
router.get('/type/:type', authenticateToken, async (req, res) => {
    const videoType = req.params.type; // e.g., 'Meditation', 'Yoga', 'Breathing'

    if (!['Meditation', 'Yoga', 'Breathing'].includes(videoType)) {
        return res.status(400).json({ message: 'Invalid video type.' });
    }

    try {
        const [videos] = await pool.query(
            'SELECT id, type, title, description, youtube_link FROM wellness_videos WHERE type = ? ORDER BY title ASC',
            [videoType]
        );
        res.status(200).json(videos);
    } catch (error) {
        console.error('Error fetching wellness videos by type:', error);
        res.status(500).json({ message: 'Server error while fetching wellness videos.' });
    }
});
*/


module.exports = router;
