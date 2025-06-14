// frontend/js/api.js

// Base URL for your backend API
const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to get the JWT token from local storage
function getToken() {
    return localStorage.getItem('token');
}

// Helper function to make authenticated API requests
async function authenticatedFetch(endpoint, options = {}) {
    const token = getToken();
    if (!token) {
        // If no token, redirect to login (or handle as unauthorized)
        console.error('No token found. Redirecting to login.');
        // Use a small delay to allow console message to be seen
        setTimeout(() => { window.location.href = 'index.html'; }, 100);
        return null; // Or throw an error
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Add the JWT token to the Authorization header
        ...options.headers, // Allow overriding headers
    };

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Handle common errors like 401 (Unauthorized) or 403 (Forbidden)
        if (response.status === 401 || response.status === 403) {
             console.error('Authentication failed. Redirecting to login.');
             localStorage.removeItem('token'); // Clear invalid token
             localStorage.removeItem('user'); // Clear user object
             // Use a small delay
             setTimeout(() => { window.location.href = 'index.html'; }, 100);
             // You might want to throw an error here instead of returning null
             return null;
        }

        return response; // Return the response object

    } catch (error) {
        console.error(`Network error during fetch to ${endpoint}:`, error);
        // Re-throw the error so calling code can handle it
        throw error;
    }
}

// --- API Functions ---

// Auth
async function registerUser(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return response.json(); // Return parsed JSON response
}

async function loginUser(credentials) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    return response; // Return the full response to check status and headers
}

// Profile
async function getUserProfile() {
    return authenticatedFetch('/profile', { method: 'GET' });
}

async function updateUserProfile(profileData) {
    return authenticatedFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    });
}

async function getWeightHistory() {
     return authenticatedFetch('/profile/weight-history', { method: 'GET' });
}


// Meals
async function searchFoods(query) {
    return authenticatedFetch(`/meals/search-foods?q=${encodeURIComponent(query)}`, { method: 'GET' });
}

async function addMeal(mealData) {
    return authenticatedFetch('/meals/add-meal', {
        method: 'POST',
        body: JSON.stringify(mealData),
    });
}

async function getDailyMealSummary(date) {
    return authenticatedFetch(`/meals/daily-summary?date=${date}`, { method: 'GET' });
}

// --- NEW API function to update a meal entry ---
async function updateMeal(mealId, updateData) {
     return authenticatedFetch(`/meals/${mealId}`, {
         method: 'PUT',
         body: JSON.stringify(updateData),
     });
}

// --- NEW API function to delete a meal entry ---
async function deleteMeal(mealId) {
     return authenticatedFetch(`/meals/${mealId}`, {
         method: 'DELETE',
     });
}


// Activities
async function getActivityTypes() {
    return authenticatedFetch('/activities/types', { method: 'GET' });
}

async function addActivity(activityData) {
    return authenticatedFetch('/activities/add-activity', {
        method: 'POST',
        body: JSON.stringify(activityData),
    });
}

async function getDailyActivitySummary(date) {
    return authenticatedFetch(`/activities/daily-summary?date=${date}`, { method: 'GET' });
}

// --- NEW API function to update an activity entry ---
async function updateActivity(activityId, updateData) {
     return authenticatedFetch(`/activities/${activityId}`, {
         method: 'PUT',
         body: JSON.stringify(updateData),
     });
}

// --- NEW API function to delete an activity entry ---
async function deleteActivity(activityId) {
     return authenticatedFetch(`/activities/${activityId}`, {
         method: 'DELETE',
     });
}


// Reminders
async function getReminders() {
     return authenticatedFetch('/reminders', { method: 'GET' });
}

async function setReminder(reminderData) {
    return authenticatedFetch('/reminders', {
        method: 'POST',
        body: JSON.stringify(reminderData),
    });
}

async function toggleReminderActiveStatus(id, is_active) {
    return authenticatedFetch(`/reminders/${id}/toggle-active`, {
        method: 'PUT',
        body: JSON.stringify({ is_active }),
    });
}

async function deleteReminder(id) {
    return authenticatedFetch(`/reminders/${id}`, {
        method: 'DELETE',
    });
}

// API function to update reminder trigger times
 async function updateReminderTriggerTimestamp(reminderId) {
    try {
        const response = await authenticatedFetch(`/reminders/${reminderId}/triggered`, {
            method: 'PUT'
        });
        console.log('Trigger update response:', response);
        return response;
    } catch (err) {
        console.error('Failed to update last_triggered:', err);
    }
}





// Export functions for use in other scripts
export {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    getWeightHistory,
    searchFoods,
    addMeal,
    getDailyMealSummary,
    updateMeal, // <-- Export new function
    deleteMeal, // <-- Export new function
    getActivityTypes,
    addActivity,
    getDailyActivitySummary,
    updateActivity, // <-- Export new function
    deleteActivity, // <-- Export new function
    getReminders,
    setReminder,
    toggleReminderActiveStatus,
    deleteReminder,
    updateReminderTriggerTimestamp,
    authenticatedFetch,
};
