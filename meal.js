// backend/routes/meal.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const authenticateToken = require('../middleware/auth'); // Our JWT authentication middleware

// Apply authenticateToken middleware to all routes in this router
router.use(authenticateToken);

// --- API to search for food items ---
router.get('/search-foods', async (req, res) => {
    const searchTerm = req.query.q; // Get the search term from query parameters

    if (!searchTerm) {
        return res.status(400).json({ message: 'Search term is required.' });
    }

    try {
        // Search for food items by name
        const [foods] = await pool.query(
            'SELECT id, name, calories, protein, carbs, fat FROM foods WHERE name LIKE ? LIMIT 20', // Limit results
            [`%${searchTerm}%`] // Use LIKE for partial matching
        );

        // Ensure numeric values are parsed correctly
        const formattedFoods = foods.map(food => ({
            id: food.id,
            name: food.name,
            calories: parseFloat(food.calories),
            protein: parseFloat(food.protein),
            carbs: parseFloat(food.carbs),
            fat: parseFloat(food.fat)
        }));


        res.status(200).json(formattedFoods);

    } catch (error) {
        console.error('Error searching foods:', error);
        res.status(500).json({ message: 'Server error while searching foods.' });
    }
});

// --- API to add a new meal entry ---
router.post('/add-meal', async (req, res) => {
    const { food_id, grams, meal_date, meal_type } = req.body;
    const userId = req.user.id; // User ID from JWT payload

    if (!food_id || !grams || !meal_date || !meal_type) {
        return res.status(400).json({ message: 'Food ID, grams, meal date, and meal type are required.' });
    }
    if (isNaN(grams) || grams <= 0) {
        return res.status(400).json({ message: 'Grams must be a positive number.' });
    }
     if (!['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(meal_type)) {
         return res.status(400).json({ message: 'Invalid meal type.' });
     }
     // Basic date format check (YYYY-MM-DD) - more robust validation could be added
     if (!/^\d{4}-\d{2}-\d{2}$/.test(meal_date)) {
          return res.status(400).json({ message: 'Invalid meal date format. Use-MM-DD.' });
     }


    try {
        // Fetch food details to get calories, protein, carbs, fat per 100g
        const [foodRows] = await pool.query(
            'SELECT calories, protein, carbs, fat FROM foods WHERE id = ?',
            [food_id]
        );
        const food = foodRows[0];

        if (!food) {
            return res.status(404).json({ message: 'Food item not found.' });
        }

        // Calculate total nutrients based on grams consumed
        const factor = grams / 100;
        const totalCalories = food.calories * factor;
        const totalProtein = food.protein * factor;
        const totalCarbs = food.carbs * factor;
        const totalFat = food.fat * factor;

        // Insert the meal entry into user_meals
        const [result] = await pool.query(
            'INSERT INTO user_meals (user_id, food_id, grams, calories, protein, carbs, fat, meal_date, meal_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, food_id, grams, totalCalories, totalProtein, totalCarbs, totalFat, meal_date, meal_type]
        );

        res.status(201).json({ message: 'Meal added successfully!', id: result.insertId });

    } catch (error) {
        console.error('Error adding meal:', error);
        res.status(500).json({ message: 'Server error while adding meal.' });
    }
});

// --- API to get daily meal summary (meals and totals) ---
router.get('/daily-summary', async (req, res) => {
    const mealDate = req.query.date; // Get the date from query parameters
    const userId = req.user.id; // User ID from JWT payload

    if (!mealDate) {
        return res.status(400).json({ message: 'Meal date is required.' });
    }
     // Basic date format check (YYYY-MM-DD)
     if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate)) {
          return res.status(400).json({ message: 'Invalid meal date format. Use-MM-DD.' });
     }


    try {
        // Fetch all meal entries for the specified user and date
        const [meals] = await pool.query(
            'SELECT um.id, um.food_id, f.name AS food_name, um.grams, um.calories, um.protein, um.carbs, um.fat, um.meal_type FROM user_meals um JOIN foods f ON um.food_id = f.id WHERE um.user_id = ? AND um.meal_date = ? ORDER BY um.meal_type, um.created_at ASC',
            [userId, mealDate]
        );

        // Calculate total nutrients for the day
        const totals = meals.reduce((sum, meal) => {
            sum.totalCalories += parseFloat(meal.calories);
            sum.totalProtein += parseFloat(meal.protein);
            sum.totalCarbs += parseFloat(meal.carbs);
            sum.totalFat += parseFloat(meal.fat);
            return sum;
        }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });

        // Ensure numeric values in meals are parsed correctly
         const formattedMeals = meals.map(meal => ({
             id: meal.id,
             food_id: meal.food_id,
             food_name: meal.food_name,
             grams: parseFloat(meal.grams),
             calories: parseFloat(meal.calories),
             protein: parseFloat(meal.protein),
             carbs: parseFloat(meal.carbs),
             fat: parseFloat(meal.fat),
             meal_type: meal.meal_type
         }));


        res.status(200).json({ meals: formattedMeals, totals: totals });

    } catch (error) {
        console.error('Error fetching daily meal summary:', error);
        res.status(500).json({ message: 'Server error while fetching daily meal summary.' });
    }
});

// --- NEW API to update a meal entry ---
router.put('/:id', async (req, res) => {
    const mealId = req.params.id;
    const { grams, meal_type } = req.body; // Allow updating grams and meal_type
    const userId = req.user.id; // User ID from JWT payload

    if (grams === undefined && meal_type === undefined) {
         return res.status(400).json({ message: 'No data provided for update.' });
    }

    // Validate grams if provided
    if (grams !== undefined && (isNaN(grams) || grams <= 0)) {
        return res.status(400).json({ message: 'Grams must be a positive number.' });
    }

    // Validate meal_type if provided
     if (meal_type !== undefined && !['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(meal_type)) {
         return res.status(400).json({ message: 'Invalid meal type.' });
     }


    try {
        // Fetch the existing meal entry to get the food_id and current grams/type
        const [mealRows] = await pool.query(
            'SELECT id, user_id, food_id, grams, meal_type FROM user_meals WHERE id = ? AND user_id = ?',
            [mealId, userId]
        );
        const existingMeal = mealRows[0];

        if (!existingMeal) {
            return res.status(404).json({ message: 'Meal entry not found or does not belong to this user.' });
        }

        // Determine the new grams and meal_type
        const newGrams = grams !== undefined ? grams : existingMeal.grams;
        const newMealType = meal_type !== undefined ? meal_type : existingMeal.meal_type;

         // If only meal_type changed, just update the type
         if (grams === undefined && meal_type !== undefined) {
              await pool.query(
                 'UPDATE user_meals SET meal_type = ? WHERE id = ?',
                 [newMealType, mealId]
             );
              return res.status(200).json({ message: 'Meal entry updated successfully!' });
         }


        // If grams changed (or both grams and type changed), recalculate nutrients
        const [foodRows] = await pool.query(
            'SELECT calories, protein, carbs, fat FROM foods WHERE id = ?',
            [existingMeal.food_id]
        );
        const food = foodRows[0]; // Should exist if the meal entry is valid

        if (!food) {
             // This indicates a data inconsistency, but handle gracefully
             console.error(`Food ID ${existingMeal.food_id} not found for meal ID ${mealId}`);
             return res.status(500).json({ message: 'Associated food item not found.' });
        }

        const factor = newGrams / 100;
        const newTotalCalories = food.calories * factor;
        const newTotalProtein = food.protein * factor;
        const newTotalCarbs = food.carbs * factor;
        const newTotalFat = food.fat * factor;

        // Update the meal entry
        await pool.query(
            'UPDATE user_meals SET grams = ?, calories = ?, protein = ?, carbs = ?, fat = ?, meal_type = ? WHERE id = ?',
            [newGrams, newTotalCalories, newTotalProtein, newTotalCarbs, newTotalFat, newMealType, mealId]
        );

        res.status(200).json({ message: 'Meal entry updated successfully!' });

    } catch (error) {
        console.error('Error updating meal entry:', error);
        res.status(500).json({ message: 'Server error while updating meal entry.' });
    }
});

// --- NEW API to delete a meal entry ---
router.delete('/:id', async (req, res) => {
    const mealId = req.params.id;
    const userId = req.user.id; // User ID from JWT payload

    try {
        // Delete the meal entry, ensuring it belongs to the authenticated user
        const [result] = await pool.query(
            'DELETE FROM user_meals WHERE id = ? AND user_id = ?',
            [mealId, userId]
        );

        if (result.affectedRows === 0) {
             // If no rows were affected, either the ID is wrong or it doesn't belong to the user
            return res.status(404).json({ message: 'Meal entry not found or does not belong to this user.' });
        }

        res.status(200).json({ message: 'Meal entry deleted successfully!' });

    } catch (error) {
        console.error('Error deleting meal entry:', error);
        res.status(500).json({ message: 'Server error while deleting meal entry.' });
    }
});


module.exports = router;
