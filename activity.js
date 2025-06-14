// backend/routes/activity.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// Apply authenticateToken middleware to all routes in this router
router.use(authenticateToken);

// --- API to get all activity types ---
router.get('/types', async (req, res) => {
    try {
        // Fetch all activity types
        const [activity] = await pool.query(
            'SELECT id, name, calories_per_min_per_kg FROM activities ORDER BY name ASC'
        );

         // Ensure numeric values are parsed correctly
         const formattedTypes = activity.map(type => ({
             id: type.id,
             name: type.name,
             calories_per_min_per_kg: parseFloat(type.calories_per_min_per_kg)
         }));

        res.status(200).json(formattedTypes);

    } catch (error) {
        console.error('Error fetching activity types:', error);
        res.status(500).json({ message: 'Server error while fetching activity types.' });
    }
});

// --- API to add a new activity entry ---
router.post('/add-activity', async (req, res) => {
    const { activity_id, duration_minutes, calories_burnt, activity_date } = req.body;
    const userId = req.user.id; // User ID from JWT payload

    if (!activity_id || !duration_minutes || calories_burnt === undefined || !activity_date) {
        return res.status(400).json({ message: 'Activity ID, duration, calories burnt, and date are required.' });
    }
    if (isNaN(duration_minutes) || duration_minutes <= 0) {
        return res.status(400).json({ message: 'Duration must be a positive number.' });
    }
     if (isNaN(calories_burnt) || calories_burnt < 0) {
        return res.status(400).json({ message: 'Calories burnt must be a non-negative number.' });
    }
     // Basic date format check (YYYY-MM-DD)
     if (!/^\d{4}-\d{2}-\d{2}$/.test(activity_date)) {
          return res.status(400).json({ message: 'Invalid activity date format. Use YYYY-MM-DD.' });
     }


    try {
        // Insert the activity entry into user_activities
        const [result] = await pool.query(
            'INSERT INTO user_activities (user_id, activity_id, duration_minutes, calories_burnt, activity_date) VALUES (?, ?, ?, ?, ?)',
            [userId, activity_id, duration_minutes, calories_burnt, activity_date]
        );

        res.status(201).json({ message: 'Activity added successfully!', id: result.insertId });

    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({ message: 'Server error while adding activity.' });
    }
});

// --- API to get daily activity summary (activities and total calories burnt) ---
router.get('/daily-summary', async (req, res) => {
    const activityDate = req.query.date; // Get the date from query parameters
    const userId = req.user.id; // User ID from JWT payload

    if (!activityDate) {
        return res.status(400).json({ message: 'Activity date is required.' });
    }
     // Basic date format check (YYYY-MM-DD)
     if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
          return res.status(400).json({ message: 'Invalid activity date format. Use YYYY-MM-DD.' });
     }

    try {
        // Fetch all activity entries for the specified user and date
        const [activities] = await pool.query(
            'SELECT ua.id, ua.activity_id, at.name AS activity_name, ua.duration_minutes, ua.calories_burnt FROM user_activities ua JOIN activities at ON ua.activity_id = at.id WHERE ua.user_id = ? AND ua.activity_date = ? ORDER BY ua.created_at ASC',
            [userId, activityDate]
        );

        // Calculate total calories burnt for the day
        const totalCaloriesBurnt = activities.reduce((sum, activity) => {
            return sum + parseFloat(activity.calories_burnt);
        }, 0);

         // Ensure numeric values in activities are parsed correctly
         const formattedActivities = activities.map(activity => ({
             id: activity.id,
             activity_id: activity.activity_id,
             activity_name: activity.activity_name,
             duration_minutes: parseFloat(activity.duration_minutes),
             calories_burnt: parseFloat(activity.calories_burnt)
         }));


        res.status(200).json({ activities: formattedActivities, totalCaloriesBurnt: totalCaloriesBurnt });

    } catch (error) {
        console.error('Error fetching daily activity summary:', error);
        res.status(500).json({ message: 'Server error while fetching daily activity summary.' });
    }
});

// --- NEW API to update an activity entry ---
router.put('/:id', async (req, res) => {
    const activityId = req.params.id;
    const { duration_minutes, calories_burnt, activity_id } = req.body; // Allow updating duration, calories burnt, and potentially activity type
    const userId = req.user.id; // User ID from JWT payload

    if (duration_minutes === undefined && calories_burnt === undefined && activity_id === undefined) {
         return res.status(400).json({ message: 'No data provided for update.' });
    }

    // Validate duration if provided
    if (duration_minutes !== undefined && (isNaN(duration_minutes) || duration_minutes <= 0)) {
        return res.status(400).json({ message: 'Duration must be a positive number.' });
    }

     // Validate calories_burnt if provided
     if (calories_burnt !== undefined && (isNaN(calories_burnt) || calories_burnt < 0)) {
        return res.status(400).json({ message: 'Calories burnt must be a non-negative number.' });
     }

     // Validate activity_id if provided (check if it exists in activity_types table)
     if (activity_id !== undefined) {
         const [typeRows] = await pool.query('SELECT id FROM activities WHERE id = ?', [activity_id]);
         if (typeRows.length === 0) {
             return res.status(400).json({ message: 'Invalid activity type ID.' });
         }
     }


    try {
        // Fetch the existing activity entry to ensure it belongs to the user
        const [activityRows] = await pool.query(
            'SELECT id, user_id FROM user_activities WHERE id = ? AND user_id = ?',
            [activityId, userId]
        );
        const existingActivity = activityRows[0];

        if (!existingActivity) {
            return res.status(404).json({ message: 'Activity entry not found or does not belong to this user.' });
        }

        // Build the update query dynamically based on provided fields
        const updateFields = [];
        const updateValues = [];

        if (duration_minutes !== undefined) {
            updateFields.push('duration_minutes = ?');
            updateValues.push(duration_minutes);
        }
        if (calories_burnt !== undefined) {
            updateFields.push('calories_burnt = ?');
            updateValues.push(calories_burnt);
        }
         if (activity_id !== undefined) {
             updateFields.push('activity_id = ?');
             updateValues.push(activity_id);
         }

        if (updateFields.length === 0) {
             return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        const updateQuery = `UPDATE user_activities SET ${updateFields.join(', ')} WHERE id = ?`;
        updateValues.push(activityId); // Add the activity ID to the end of values

        await pool.query(updateQuery, updateValues);

        res.status(200).json({ message: 'Activity entry updated successfully!' });

    } catch (error) {
        console.error('Error updating activity entry:', error);
        res.status(500).json({ message: 'Server error while updating activity entry.' });
    }
});

// --- NEW API to delete an activity entry ---
router.delete('/:id', async (req, res) => {
    const activityId = req.params.id;
    const userId = req.user.id; // User ID from JWT payload

    try {
        // Delete the activity entry, ensuring it belongs to the authenticated user
        const [result] = await pool.query(
            'DELETE FROM user_activities WHERE id = ? AND user_id = ?',
            [activityId, userId]
        );

        if (result.affectedRows === 0) {
             // If no rows were affected, either the ID is wrong or it doesn't belong to the user
            return res.status(404).json({ message: 'Activity entry not found or does not belong to this user.' });
        }

        res.status(200).json({ message: 'Activity entry deleted successfully!' });

    } catch (error) {
        console.error('Error deleting activity entry:', error);
        res.status(500).json({ message: 'Server error while deleting activity entry.' });
    }
});


module.exports = router;
