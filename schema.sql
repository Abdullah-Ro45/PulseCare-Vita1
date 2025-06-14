-- backend/sql/schema.sql

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS fitness_tracker_db;

-- Use the database
USE fitness_tracker_db;

-- Table for users (authentication details)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    gender ENUM('Male', 'Female', 'Other'),
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user profiles (stores weight, height, goals, linked to users)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    current_weight DECIMAL(5,2), -- in kg
    height DECIMAL(5,2), -- in cm
    weight_goal DECIMAL(5,2), -- in kg
    activity_level ENUM('Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for food items (nutritional data per 100g)
CREATE TABLE IF NOT EXISTS foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    calories DECIMAL(6,2) NOT NULL, -- per 100g
    protein DECIMAL(6,2) NOT NULL,  -- per 100g
    carbs DECIMAL(6,2) NOT NULL,    -- per 100g
    fat DECIMAL(6,2) NOT NULL       -- per 100g
);

-- Table for tracking user meals
CREATE TABLE IF NOT EXISTS user_meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    meal_date DATE NOT NULL,
    meal_type ENUM('Breakfast', 'Lunch', 'Dinner', 'Snack') NOT NULL, -- Type of meal
    grams DECIMAL(10,2) NOT NULL, -- Amount consumed in grams
    calories DECIMAL(10,2) NOT NULL, -- Calculated calories for this entry
    protein DECIMAL(10,2) NOT NULL,  -- Calculated protein for this entry
    carbs DECIMAL(10,2) NOT NULL,    -- Calculated carbs for this entry
    fat DECIMAL(10,2) NOT NULL,      -- Calculated fat for this entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Table for general activity types and their calorie burn rates (per minute per kg)
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    -- Calories burned per minute per KG of body weight (based on MET values)
    calories_per_min_per_kg DECIMAL(6,3) NOT NULL
);

-- Table to log user's performed activities
CREATE TABLE IF NOT EXISTS user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_id INT NOT NULL,
    activity_date DATE NOT NULL,
    duration_minutes DECIMAL(10,2) NOT NULL, -- Duration of the activity in minutes
    calories_burnt DECIMAL(10,2) NOT NULL, -- Total calories burnt for this specific activity entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Table for user reminders (Water, Sleep, Workout)
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('water', 'sleep', 'workout') NOT NULL, -- Type of reminder
    frequency_minutes DECIMAL(10,2), -- For water intake (e.g., 0.1 for very short, 30, 60)
    time_of_day TIME, -- For sleep/workout reminders (e.g., '22:00:00')
    last_triggered DATETIME, -- To track when the reminder was last acted upon/triggered
    is_active BOOLEAN DEFAULT TRUE, -- Whether the reminder is currently active
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for storing user's weight history for progress tracking
CREATE TABLE IF NOT EXISTS weight_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    record_date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL, -- Weight recorded on this date
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY user_date_unique (user_id, record_date) -- Prevent duplicate entries for the same user on the same day
);

-- Table for exercises with details and video links (Placeholder structure)
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category ENUM('Gym', 'Home', 'Ground') NOT NULL,
    level ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
    goal ENUM('Gain Muscle', 'Burn Fat', 'Stay Fit') NOT NULL,
    muscle_group VARCHAR(100), -- e.g., 'Chest', 'Biceps', 'Cardio'
    equipment_needed TEXT,
    common_mistakes TEXT,
    youtube_link VARCHAR(255) NOT NULL UNIQUE
);

-- Table for meditation/yoga/breathing videos (Placeholder structure)
CREATE TABLE IF NOT EXISTS wellness_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('Meditation', 'Yoga', 'Breathing') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    youtube_link VARCHAR(255) NOT NULL UNIQUE
);

USE fitness_tracker_db; -- Ensure you are using your database

-- Add is_admin column to users table


-- Optional: Update an existing user to be an admin (replace 1 with the user ID you want to make admin)
-- SELECT id, username FROM users; -- Run this first to find the user ID
-- UPDATE users SET is_admin = TRUE WHERE id = 1;