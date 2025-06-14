// frontend/js/dashboard.js
import { getUserProfile, getDailyMealSummary, getDailyActivitySummary } from './api.js'; // Import necessary API functions

document.addEventListener('DOMContentLoaded', async () => {
    // dashboard_common.js handles token check and sidebar/logout

    // Get elements to display data
    const welcomeMessageSpan = document.getElementById('welcomeMessage'); // Welcome message span
    const caloriesConsumedSpan = document.getElementById('caloriesConsumed');
    const caloriesBurntSpan = document.getElementById('caloriesBurnt');
    const netCaloriesSpan = document.getElementById('netCalories');
    const estimatedDailyCaloriesSpan = document.getElementById('estimatedDailyCalories');

    const statWeightSpan = document.getElementById('statWeight');
    const statHeightSpan = document.getElementById('statHeight');
    const statAgeSpan = document.getElementById('statAge');
    const statWeightGoalSpan = document.getElementById('statWeightGoal');
    const statActivityLevelSpan = document.getElementById('statActivityLevel');

    const progressMessage = document.getElementById('progressMessage'); // Assuming a message area exists for general dashboard messages


     // Helper function to display messages (can be used for errors/info)
    function displayMessage(message, type) {
        // --- Debugging: Log when displayMessage is called ---
        console.log(`[Dashboard Frontend] displayMessage called with: "${message}", type: "${type}"`);

        if (progressMessage) { // Check if the message element exists
            progressMessage.textContent = message;
            progressMessage.className = `message ${type}-message`;
            progressMessage.classList.remove('hidden');
             // Optional: Hide message after a few seconds
            // setTimeout(() => {
            //     progressMessage.classList.add('hidden');
            // }, 3000);
        } else {
             console.warn(`[Dashboard Frontend] Message element not found. Message: "${message}"`);
        }
    }

     function clearMessage() {
         console.log('[Dashboard Frontend] clearMessage called.');
         if (progressMessage) {
             progressMessage.textContent = '';
             progressMessage.classList.add('hidden');
         }
    }


    // Function to fetch and display user profile data
    async function fetchAndDisplayProfile() {
        console.log('[Dashboard Frontend] Attempting to fetch profile data...');
        try {
            const response = await getUserProfile(); // Use API function
            // --- Debugging: Log the response status ---
            console.log('[Dashboard Frontend] getUserProfile response status:', response ? response.status : 'null response');

             // Check if response is valid before parsing
            if (!response) {
                 console.error('[Dashboard Frontend] getUserProfile: Authentication error, response is null.');
                 displayMessage('Failed to load profile data (Authentication error).', 'error');
                 return null; // Return null to indicate failure
            }
            const profileData = await response.json();

            // --- Debugging: Log the parsed response body ---
             console.log('[Dashboard Frontend] getUserProfile response body:', profileData);


            if (response.ok) {
                // Display welcome message
                welcomeMessageSpan.textContent = `Welcome, ${profileData.username || 'User'}!`;

                // Display profile stats
                statWeightSpan.textContent = profileData.current_weight !== null ? profileData.current_weight.toFixed(1) : '--';
                statHeightSpan.textContent = profileData.height !== null ? profileData.height.toFixed(1) : '--';
                statAgeSpan.textContent = profileData.age !== null ? profileData.age : '--';
                statWeightGoalSpan.textContent = profileData.weight_goal !== null ? profileData.weight_goal.toFixed(1) : '--';
                statActivityLevelSpan.textContent = profileData.activity_level || '--';

                // Return profile data for use in calorie calculation
                return profileData;

            } else {
                console.error('Failed to fetch profile data:', profileData.message);
                displayMessage(profileData.message || 'Failed to load profile data.', 'error');
                 return null; // Return null to indicate failure
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
            displayMessage('An error occurred while loading profile data.', 'error');
             return null; // Return null to indicate failure
        }
    }

    // Function to fetch and display daily meal summary
    async function fetchAndDisplayDailyMeals() {
         console.log('[Dashboard Frontend] Attempting to fetch daily meal summary...');
        const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
        try {
            const response = await getDailyMealSummary(today); // Use API function
             // --- Debugging: Log the response status ---
            console.log('[Dashboard Frontend] getDailyMealSummary response status:', response ? response.status : 'null response');

             // Check if response is valid before parsing
            if (!response) {
                 console.error('[Dashboard Frontend] getDailyMealSummary: Authentication error, response is null.');
                 // displayMessage('Failed to load meal summary (Authentication error).', 'error'); // Avoid multiple auth errors
                 return 0; // Return 0 calories
            }

            if (response.ok) {
                const data = await response.json(); // data should contain { meals: [...], totals: {...} }
                 // --- Debugging: Log the parsed response body ---
                 console.log('[Dashboard Frontend] getDailyMealSummary response body:', data);

                const totalCaloriesConsumed = data.totals && data.totals.totalCalories !== null ? parseFloat(data.totals.totalCalories) : 0;
                caloriesConsumedSpan.textContent = totalCaloriesConsumed.toFixed(1);
                return totalCaloriesConsumed; // Return total calories
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                     errorData = { message: `Server error: ${response.status} ${response.statusText}` };
                     console.error('Failed to parse meal summary error response as JSON. Raw response:', await response.text());
                }
                console.error('Failed to fetch daily meal summary:', errorData.message);
                // displayMessage(errorData.message || 'Error loading meal summary.', 'error'); // Avoid multiple errors
                caloriesConsumedSpan.textContent = '0.0';
                return 0; // Return 0 calories on error
            }
        } catch (error) {
            console.error('Error fetching daily meal summary:', error);
            // displayMessage('An error occurred while fetching meal summary.', 'error'); // Avoid multiple errors
            caloriesConsumedSpan.textContent = '0.0';
            return 0; // Return 0 calories on error
        }
    }

    // Function to fetch and display daily activity summary
    async function fetchAndDisplayDailyActivities() {
         console.log('[Dashboard Frontend] Attempting to fetch daily activity summary...');
        const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
        try {
            const response = await getDailyActivitySummary(today); // Use API function
             // --- Debugging: Log the response status ---
            console.log('[Dashboard Frontend] getDailyActivitySummary response status:', response ? response.status : 'null response');

             // Check if response is valid before parsing
            if (!response) {
                 console.error('[Dashboard Frontend] getDailyActivitySummary: Authentication error, response is null.');
                 // displayMessage('Failed to load activity summary (Authentication error).', 'error'); // Avoid multiple auth errors
                 return 0; // Return 0 calories
            }

            if (response.ok) {
                const data = await response.json(); // data should contain { activities: [...], totalCaloriesBurnt: number }
                 // --- Debugging: Log the parsed response body ---
                 console.log('[Dashboard Frontend] getDailyActivitySummary response body:', data);

                const totalCaloriesBurnt = data.totalCaloriesBurnt !== null ? parseFloat(data.totalCaloriesBurnt) : 0;
                caloriesBurntSpan.textContent = totalCaloriesBurnt.toFixed(1);
                return totalCaloriesBurnt; // Return total calories burnt
            } else {
                 let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonError) {
                     errorData = { message: `Server error: ${response.status} ${response.statusText}` };
                      console.error('Failed to parse activity summary error response as JSON. Raw response:', await response.text());
                }
                console.error('Failed to fetch daily activity summary:', errorData.message);
                // displayMessage(errorData.message || 'Error loading activity summary.', 'error'); // Avoid multiple errors
                caloriesBurntSpan.textContent = '0.0';
                return 0; // Return 0 calories on error
            }
        } catch (error) {
            console.error('Error fetching daily activity summary:', error);
            // displayMessage('An error occurred while fetching activity summary.', 'error'); // Avoid multiple errors
            caloriesBurntSpan.textContent = '0.0';
            return 0; // Return 0 calories on error
        }
    }

    // Function to calculate and display net calories
    function calculateAndDisplayNetCalories(consumed, burnt, estimated) {
        const net = consumed - burnt;
        netCaloriesSpan.textContent = net.toFixed(1);

        // Calculate remaining calories based on estimated needs
        if (estimated !== null) {
             const remaining = estimated - net;
             estimatedDailyCaloriesSpan.textContent = estimated.toFixed(0); // Display estimated needs
             // You might want another span for remaining calories if needed
             // For now, Net Calories implies consumed - burnt. Estimated needs is separate.
        } else {
             estimatedDailyCaloriesSpan.textContent = '--'; // No estimated needs if profile data is missing
        }

         // Optional: Change color of net calories based on value vs goal
         // This requires knowing the user's calorie goal, which isn't directly on the dashboard summary yet.
    }


    // --- Initialize Dashboard Data ---
    async function loadDashboardData() {
        clearMessage(); // Clear any initial messages

        // Fetch profile data first (needed for estimated calories)
        const profileData = await fetchAndDisplayProfile();

        // Fetch meal and activity summaries concurrently
        const [totalConsumed, totalBurnt] = await Promise.all([
            fetchAndDisplayDailyMeals(),
            fetchAndDisplayDailyActivities()
        ]);

        // Calculate and display net calories after fetching consumed and burnt totals
        const estimated = profileData && profileData.estimatedDailyCalories !== null ? profileData.estimatedDailyCalories : null;
        calculateAndDisplayNetCalories(totalConsumed, totalBurnt, estimated);

         // If profile data failed to load, estimated calories will be null, handled in calculateAndDisplayNetCalories
    }


    // Load data when the page is ready
    loadDashboardData();

});
