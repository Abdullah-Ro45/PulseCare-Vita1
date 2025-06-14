// backend/routes/reminders.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// --- API to get all reminders for the authenticated user ---
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // User ID from JWT payload

const [reminders] = await pool.query(
    'SELECT id, type, frequency_minutes, TIME_FORMAT(time_of_day, "%H:%i") AS time_of_day, is_active, last_triggered FROM reminders WHERE user_id = ? ORDER BY type, time_of_day, frequency_minutes',
    [userId]
);


         // Ensure numeric values are parsed correctly
         const formattedReminders = reminders.map(r => ({
             ...r,
             frequency_minutes: r.frequency_minutes !== null ? parseFloat(r.frequency_minutes) : null,
             is_active: r.is_active === 1 // Convert tinyint(1) to boolean
         }));


        res.status(200).json(formattedReminders);

    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ message: 'Server error while fetching reminders.' });
    }
});

// --- API to set/create a new reminder ---
router.post('/', authenticateToken, async (req, res) => {
    const { type, frequency_minutes, time_of_day } = req.body;
    const userId = req.user.id;

    if (!type || !['water', 'sleep', 'workout'].includes(type)) {
        return res.status(400).json({ message: 'Invalid reminder type.' });
    }

    // Validation based on type
    if (type === 'water') {
        if (frequency_minutes === undefined || isNaN(frequency_minutes) || frequency_minutes <= 0) {
            return res.status(400).json({ message: 'Frequency (in minutes) is required and must be a positive number for water reminders.' });
        }
        // Ensure time_of_day is null for water reminders
        if (time_of_day !== null && time_of_day !== undefined) {
             console.warn(`Received unexpected time_of_day for water reminder: ${time_of_day}`);
        }
    } else { // sleep or workout
        if (!time_of_day) {
            return res.status(400).json({ message: 'Time of day is required for sleep and workout reminders.' });
        }
         // Ensure frequency_minutes is null for time-based reminders
         if (frequency_minutes !== null && frequency_minutes !== undefined) {
              console.warn(`Received unexpected frequency_minutes for ${type} reminder: ${frequency_minutes}`);
         }
    }

    try {
        // Check if a reminder of this type already exists for the user
        // For water, only one frequency is expected. For sleep/workout, only one time is expected.
        const [existing] = await pool.query(
            'SELECT id FROM reminders WHERE user_id = ? AND type = ?',
            [userId, type]
        );

        if (existing.length > 0) {
            // If exists, update the existing one instead of creating a new one
            const reminderIdToUpdate = existing[0].id;
             await pool.query(
                 'UPDATE reminders SET frequency_minutes = ?, time_of_day = ?, is_active = TRUE WHERE id = ?',
                 [type === 'water' ? frequency_minutes : null, type !== 'water' ? time_of_day : null, reminderIdToUpdate]
             );
             return res.status(200).json({ message: `${type} reminder updated successfully!` });
        }


        // If it doesn't exist, insert a new reminder
        const [result] = await pool.query(
            'INSERT INTO reminders (user_id, type, frequency_minutes, time_of_day, is_active) VALUES (?, ?, ?, ?, TRUE)',
            [userId, type, type === 'water' ? frequency_minutes : null, type !== 'water' ? time_of_day : null]
        );

        res.status(201).json({ message: `${type} reminder set successfully!` });

    } catch (error) {
        console.error('Error setting reminder:', error);
        res.status(500).json({ message: 'Server error while setting reminder.' });
    }
});

// --- API to toggle reminder active status ---
router.put('/:id/toggle-active', authenticateToken, async (req, res) => {
    const reminderId = req.params.id;
    const { is_active } = req.body; // Expected boolean value
    const userId = req.user.id;

    if (is_active === undefined || typeof is_active !== 'boolean') {
        return res.status(400).json({ message: 'Invalid active status provided.' });
    }

    try {
        // Update the reminder status, ensuring it belongs to the authenticated user
        const [result] = await pool.query(
            'UPDATE reminders SET is_active = ? WHERE id = ? AND user_id = ?',
            [is_active, reminderId, userId]
        );

        if (result.affectedRows === 0) {
            // If no rows were affected, either the ID is wrong or it doesn't belong to the user
            return res.status(404).json({ message: 'Reminder not found or does not belong to this user.' });
        }

        res.status(200).json({ message: 'Reminder status updated successfully!' });

    } catch (error) {
        console.error('Error toggling reminder status:', error);
        res.status(500).json({ message: 'Server error while toggling reminder status.' });
    }
});

// --- API to delete a reminder ---
router.delete('/:id', authenticateToken, async (req, res) => {
    const reminderId = req.params.id;
    const userId = req.user.id;

    try {
        // Delete the reminder, ensuring it belongs to the authenticated user
        const [result] = await pool.query(
            'DELETE FROM reminders WHERE id = ? AND user_id = ?',
            [reminderId, userId]
        );

        if (result.affectedRows === 0) {
             // If no rows were affected, either the ID is wrong or it doesn't belong to the user
            return res.status(404).json({ message: 'Reminder not found or does not belong to this user.' });
        }

        res.status(200).json({ message: 'Reminder deleted successfully!' });

    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ message: 'Server error while deleting reminder.' });
    }
});
// --- API to update last_triggered ---
router.put('/:id/triggered', authenticateToken, async (req, res) => {
    const reminderId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(reminderId)) {
        return res.status(400).json({ message: 'Invalid reminder ID.' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE reminders 
             SET last_triggered = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [reminderId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Reminder not found or access denied.' });
        }

        res.status(200).json({ message: 'last_triggered updated.' });

    } catch (err) {
        console.error('Error updating last_triggered:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


module.exports = router;