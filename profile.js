// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// Helper function to calculate age from DOB
function calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Helper function to format date to YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
    if (!date) return null;
    const d = new Date(date);
    // Ensure the date is valid before formatting
    if (isNaN(d.getTime())) {
        console.error("Invalid date object provided to formatDateToYYYYMMDD:", date);
        return null;
    }
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}


// --- Get User Profile ---
// Protected route: requires a valid JWT
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // User ID from JWT payload
        const today = new Date().toISOString().slice(0, 10); // Current date in YYYY-MM-DD

        // Fetch user details from users table
        const [userRows] = await pool.query(
            'SELECT username, email, gender, date_of_birth FROM users WHERE id = ?',
            [userId]
        );
        const user = userRows[0];

        if (!user) {
             return res.status(404).json({ message: 'User not found.' });
        }

        // Fetch profile details from user_profiles table
        const [profileRows] = await pool.query(
            'SELECT current_weight, height, weight_goal, activity_level FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        const userProfile = profileRows[0] || {}; // Use empty object if no profile exists yet

        // Calculate age
        const age = calculateAge(user.date_of_birth);

        // Fetch total calories consumed today from user_meals
        const [mealSummaryRows] = await pool.query(
            'SELECT SUM(calories) AS total_calories_consumed FROM user_meals WHERE user_id = ? AND meal_date = ?',
            [userId, today]
        );
        const caloriesConsumedToday = mealSummaryRows[0].total_calories_consumed || 0; // Default to 0 if null

        // Fetch total calories burnt today from user_activities
        const [activitySummaryRows] = await pool.query(
            'SELECT SUM(calories_burnt) AS total_calories_burnt FROM user_activities WHERE user_id = ? AND activity_date = ?',
            [userId, today]
        );
        const caloriesBurntToday = activitySummaryRows[0].total_calories_burnt || 0; // Default to 0 if null

        // Calculate estimated daily calorie needs (Placeholder/Simplified)
        // This is a basic calculation; a real app would use Harris-Benedict or Mifflin-St Jeor
        let bmr = 0; // Basal Metabolic Rate
        if (userProfile.current_weight && userProfile.height && age && user.gender) {
             // Using simplified BMR calculation (Mifflin-St Jeor approximation)
             if (user.gender === 'Male') {
                 bmr = (10 * userProfile.current_weight) + (6.25 * userProfile.height) - (5 * age) + 5;
             } else if (user.gender === 'Female') {
                 bmr = (10 * userProfile.current_weight) + (6.25 * userProfile.height) - (5 * age) - 161;
             }
        }

        let activityMultiplier = 1.2; // Sedentary
        switch (userProfile.activity_level) {
            case 'Lightly Active': activityMultiplier = 1.375; break;
            case 'Moderately Active': activityMultiplier = 1.55; break;
            case 'Very Active': activityMultiplier = 1.725; break;
            case 'Extra Active': activityMultiplier = 1.9; break;
        }

        const estimatedDailyCalories = bmr > 0 ? (bmr * activityMultiplier).toFixed(0) : null;


        res.status(200).json({
            username: user.username,
            email: user.email,
            gender: user.gender,
            // --- FIX: Format date_of_birth to YYYY-MM-DD before sending ---
            // Check if user.date_of_birth exists before formatting
            date_of_birth: user.date_of_birth ? formatDateToYYYYMMDD(user.date_of_birth) : null,
            age: age,
            current_weight: userProfile.current_weight ? parseFloat(userProfile.current_weight) : null, // Ensure number
            height: userProfile.height ? parseFloat(userProfile.height) : null, // Ensure number
            weight_goal: userProfile.weight_goal ? parseFloat(userProfile.weight_goal) : null, // Ensure number
            activity_level: userProfile.activity_level,
            caloriesConsumedToday: parseFloat(caloriesConsumedToday), // Ensure number
            caloriesBurntToday: parseFloat(caloriesBurntToday), // Ensure number
            estimatedDailyCalories: estimatedDailyCalories ? parseFloat(estimatedDailyCalories) : null // Ensure number or null
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error while fetching profile.' });
    }
});

// --- Update User Profile --- (Existing route - debugging logs kept)
// Protected route: requires a valid JWT
router.put('/', authenticateToken, async (req, res) => {
    const { username, gender, date_of_birth, current_weight, height, weight_goal, activity_level } = req.body;
    const userId = req.user.id; // User ID from JWT payload

    // --- Debugging: Log incoming data ---
    console.log(`[Profile PUT] Received data for user ${userId}:`, req.body);


    // Basic validation (check if at least one field is provided)
    if (username === undefined && gender === undefined && date_of_birth === undefined &&
        current_weight === undefined && height === undefined && weight_goal === undefined && activity_level === undefined) {
        console.log('[Profile PUT] No data provided for update.');
        return res.status(400).json({ message: 'No data provided for update.' });
    }

    try {
        // Update users table (username, gender, date_of_birth)
        if (username !== undefined || gender !== undefined || date_of_birth !== undefined) {
             const updateUserData = {};
             if (username !== undefined) updateUserData.username = username;
             if (gender !== undefined) updateUserData.gender = gender;
             // --- Ensure date_of_birth is not an empty string before adding to update data ---
             // If an empty string is sent, set to NULL in the DB.
             if (date_of_birth !== undefined) { // Check if the key exists in the payload
                 // If date_of_birth is an empty string, set to null; otherwise, use the provided value
                 updateUserData.date_of_birth = date_of_birth === '' ? null : date_of_birth;
             }


             if (Object.keys(updateUserData).length > 0) {
                 console.log('[Profile PUT] Updating users table with:', updateUserData);
                 const [userUpdateResult] = await pool.query('UPDATE users SET ? WHERE id = ?', [updateUserData, userId]);
                 console.log('[Profile PUT] Users table update result:', userUpdateResult);
             }
        }

        // Update user_profiles table (weight, height, weight_goal, activity_level)
        if (current_weight !== undefined || height !== undefined || weight_goal !== undefined || activity_level !== undefined) {
            const updateProfileData = {};
            if (current_weight !== undefined) {
                 if (isNaN(current_weight) || current_weight <= 0) return res.status(400).json({ message: 'Weight must be a positive number.' });
                 updateProfileData.current_weight = current_weight;
            }
            if (height !== undefined) {
                 if (isNaN(height) || height <= 0) return res.status(400).json({ message: 'Height must be a positive number.' });
                 updateProfileData.height = height;
            }
            if (weight_goal !== undefined) {
                 if (isNaN(weight_goal) || weight_goal <= 0) return res.status(400).json({ message: 'Weight goal must be a positive number.' });
                 updateProfileData.weight_goal = weight_goal;
            }
            if (activity_level !== undefined) updateProfileData.activity_level = activity_level;

            if (Object.keys(updateProfileData).length > 0) {
                 console.log('[Profile PUT] Updating user_profiles table with:', updateProfileData);
                 // Check if a profile entry exists for the user
                 const [existingProfile] = await pool.query('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);

                 if (existingProfile.length === 0) {
                     // If no profile exists, insert a new one
                     updateProfileData.user_id = userId; // Add user_id for insert
                     const [profileInsertResult] = await pool.query('INSERT INTO user_profiles SET ?', [updateProfileData]);
                      console.log('[Profile PUT] User_profiles insert result:', profileInsertResult);
                 } else {
                     // If profile exists, update it
                     const [profileUpdateResult] = await pool.query('UPDATE user_profiles SET ? WHERE user_id = ?', [updateProfileData, userId]);
                      console.log('[Profile PUT] User_profiles update result:', profileUpdateResult);
                 }
            }
        }

        // If weight is updated, add an entry to weight_history
        if (current_weight !== undefined && !isNaN(current_weight) && current_weight > 0) {
             const today = new Date().toISOString().slice(0, 10);
             console.log('[Profile PUT] Adding/Updating weight history for date:', today, 'weight:', current_weight);
             // Use INSERT ... ON DUPLICATE KEY UPDATE to handle multiple updates on the same day
             const [weightHistoryResult] = await pool.query(
                 'INSERT INTO weight_history (user_id, record_date, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = VALUES(weight)',
                 [userId, today, current_weight]
             );
             console.log('[Profile PUT] Weight history result:', weightHistoryResult);
        }


        res.status(200).json({ message: 'Profile updated successfully!' });

    } catch (error) {
        console.error('Error updating user profile:', error);
        // Check for duplicate username error specifically
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('username')) {
             return res.status(409).json({ message: 'Username already taken.' });
        }
        res.status(500).json({ message: 'Server error while updating profile.' });
    }
});

// --- API to get Weight History ---
// Protected route: requires a valid JWT
router.get('/weight-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // User ID from JWT payload

        // Fetch weight history, ordered by date
        const [historyRows] = await pool.query(
            'SELECT record_date, weight FROM weight_history WHERE user_id = ? ORDER BY record_date ASC',
            [userId]
        );

        // Ensure weight is returned as a number
        const weightHistory = historyRows.map(entry => ({
            record_date: entry.record_date, // Date object or string depending on driver config
            weight: parseFloat(entry.weight) // Ensure weight is a number
        }));

        res.status(200).json(weightHistory);

    } catch (error) {
        console.error('Error fetching weight history:', error);
        res.status(500).json({ message: 'Server error while fetching weight history.' });
    }
});


module.exports = router;
