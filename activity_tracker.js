// frontend/js/activity_tracker.js
// Import API functions, renaming addActivity and deleteActivity to avoid conflict
import { getActivityTypes, addActivity as apiAddActivity, getDailyActivitySummary, deleteActivity as apiDeleteActivity, updateActivity, getUserProfile } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // dashboard_common.js handles token check and sidebar/logout

    // Date navigation elements
    const activityDateInput = document.getElementById('activityDateInput');
    const prevActivityDayBtn = document.getElementById('prevActivityDayBtn');
    const nextActivityDayBtn = document.getElementById('nextActivityDayBtn');

    // Add/Edit activity elements
    const activityTypeSelect = document.getElementById('activityTypeSelect');
    const durationMinutesInput = document.getElementById('durationMinutesInput');
    const estimatedCaloriesSpan = document.getElementById('estimatedCalories');
    const addActivityBtn = document.getElementById('addActivityBtn'); // This button will become "Update Activity" in edit mode
    const cancelActivityEditBtn = document.getElementById('cancelActivityEditBtn'); // Button to cancel editing
    const activityAddMessage = document.getElementById('activityAddMessage'); // Message area for adding/editing activity

    // Daily log elements
    const activityLogDiv = document.getElementById('activityLog');
    const totalDailyCaloriesBurntSpan = document.getElementById('totalDailyCaloriesBurnt');

    let activitiesData = []; // To store fetched activity types (from activity_types table)
    let currentDailyActivities = []; // To store fetched user activity entries for the current day
    let currentUserWeight = null; // To store user's current weight for calorie calculation
    let currentDisplayDate = new Date(); // Tracks the date currently being displayed
    let editingActivityId = null; // Stores the ID of the activity entry being edited (null when adding)


    // --- Helper Functions ---
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}-message`;
        element.classList.remove('hidden');
        // Optional: Hide message after a few seconds
        // setTimeout(() => {
        //     element.classList.add('hidden');
        // }, 3000);
    }

     function clearMessage(element) {
         element.textContent = '';
         element.classList.add('hidden');
    }


    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    function setDisplayDate(date) {
        currentDisplayDate = new Date(date); // Store as Date object
        activityDateInput.value = formatDate(currentDisplayDate); // Display in input
        fetchDailyActivities(formatDate(currentDisplayDate)); // Fetch activities for this date
    }

     // Function to clear the add/edit activity form and reset to 'Add' mode
    function resetActivityForm() {
        editingActivityId = null; // No activity is being edited
        // Reset activity type select to the first option or a default
        if (activityTypeSelect.options.length > 0) {
             activityTypeSelect.selectedIndex = 0;
        }
        durationMinutesInput.value = '30'; // Reset to a default duration
        calculateEstimatedCalories(); // Recalculate estimated calories for the reset state
        addActivityBtn.textContent = 'Add Activity'; // Change button text back
        cancelActivityEditBtn.style.display = 'none'; // Hide cancel button
        clearMessage(activityAddMessage); // Clear form messages
         // Re-enable activity type select if it was disabled during edit
         activityTypeSelect.disabled = false;
    }


    // --- Event Listeners for Date Navigation ---
    activityDateInput.addEventListener('change', (e) => {
         if (e.target.value) {
             setDisplayDate(new Date(e.target.value));
         }
    });

    prevActivityDayBtn.addEventListener('click', () => {
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() - 1);
        setDisplayDate(newDate);
    });

    nextActivityDayBtn.addEventListener('click', () => {
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() + 1);
        setDisplayDate(newDate);
    });

    // --- Fetch User Weight and Activity Types on Load ---
    async function initActivityTracker() {
        await fetchUserWeight(); // Fetch weight first
        await fetchActivityTypes(); // Then fetch activity types
        setDisplayDate(new Date()); // Initialize with today's date
    }

    async function fetchUserWeight() {
        try {
            const response = await getUserProfile(); // Use API function
             // Check if response is valid before parsing
            if (!response) {
                 displayMessage(activityAddMessage, 'Could not fetch weight (Authentication error).', 'info');
                 addActivityBtn.disabled = true; // Disable add button
                 return; // Stop execution
            }
            const profileData = await response.json();

            if (response.ok) {
                currentUserWeight = profileData.current_weight; // Get weight in kg (should be a number from backend)
                if (!currentUserWeight || currentUserWeight <= 0) {
                    displayMessage(activityAddMessage, 'Please set your weight in "Profile" for accurate calorie calculation.', 'info');
                    addActivityBtn.disabled = true; // Disable add button if weight is missing
                } else {
                     addActivityBtn.disabled = false; // Enable button if weight is set
                }
            } else {
                console.error('Failed to fetch user weight:', profileData.message);
                 displayMessage(activityAddMessage, 'Could not fetch weight. Calorie calculation may be inaccurate.', 'info');
                 addActivityBtn.disabled = true; // Disable if profile fetch fails
            }
        } catch (error) {
            console.error('Error fetching user weight:', error);
             displayMessage(activityAddMessage, 'Error fetching weight. Calorie calculation may be inaccurate.', 'info');
             addActivityBtn.disabled = true; // Disable on network error
        }
    }

    async function fetchActivityTypes() {
        try {
            const response = await getActivityTypes(); // Use API function
             // Check if response is valid before parsing
            if (!response) {
                 displayMessage(activityAddMessage, 'Error loading activity types (Authentication error).', 'error');
                 activityTypeSelect.disabled = true;
                 addActivityBtn.disabled = true;
                 return; // Stop execution
            }
            activitiesData = await response.json(); // This should be an array of activity objects

            activityTypeSelect.innerHTML = ''; // Clear existing options
            if (Array.isArray(activitiesData) && activitiesData.length > 0) {
                activitiesData.forEach(activity => {
                    const option = document.createElement('option');
                    option.value = activity.id;
                    // Store rate in dataset, ensure it's a number
                    option.dataset.caloriesPerMinPerKg = parseFloat(activity.calories_per_min_per_kg);
                    option.textContent = activity.name;
                    activityTypeSelect.appendChild(option);
                });
                activityTypeSelect.disabled = false; // Enable select
                calculateEstimatedCalories(); // Calculate for initial selection
            } else {
                const option = document.createElement('option');
                option.textContent = 'No activities available';
                activityTypeSelect.appendChild(option);
                activityTypeSelect.disabled = true; // Disable select if no activities
                addActivityBtn.disabled = true; // Disable add button
                 displayMessage(activityAddMessage, 'No activity types loaded.', 'info');
            }
        } catch (error) {
            console.error('Error fetching activity types:', error);
            displayMessage(activityAddMessage, 'Error loading activity types.', 'error');
             activityTypeSelect.disabled = true;
             addActivityBtn.disabled = true;
        }
    }

    // --- Calculate Estimated Calories ---
    activityTypeSelect.addEventListener('change', calculateEstimatedCalories);
    durationMinutesInput.addEventListener('input', calculateEstimatedCalories);

    function calculateEstimatedCalories() {
        const selectedOption = activityTypeSelect.options[activityTypeSelect.selectedIndex];
        // Get the rate from the dataset, ensure it's a number
        const caloriesPerMinPerKg = parseFloat(selectedOption.dataset.caloriesPerMinPerKg);
        const duration = parseFloat(durationMinutesInput.value);

        // Ensure we have a valid rate, duration, and user weight
        if (isNaN(caloriesPerMinPerKg) || isNaN(duration) || duration <= 0 || !currentUserWeight || currentUserWeight <= 0) {
            estimatedCaloriesSpan.textContent = '0.0';
            return;
        }

        const estimatedCalories = caloriesPerMinPerKg * duration * currentUserWeight;
        estimatedCaloriesSpan.textContent = estimatedCalories.toFixed(1);
    }

    // --- Add/Update Activity Functionality ---
    addActivityBtn.addEventListener('click', handleAddOrUpdateActivity);
    cancelActivityEditBtn.addEventListener('click', resetActivityForm); // Add listener for cancel button


    async function handleAddOrUpdateActivity() {
        clearMessage(activityAddMessage); // Clear previous messages

        const activityId = activityTypeSelect.value;
        const duration = parseFloat(durationMinutesInput.value);
        const caloriesBurnt = parseFloat(estimatedCaloriesSpan.textContent); // Use the calculated value from the span

        if (!activityId || isNaN(duration) || duration <= 0 || isNaN(caloriesBurnt) || caloriesBurnt < 0) {
            displayMessage(activityAddMessage, 'Please select an activity and enter a valid duration.', 'error');
            return;
        }
        if (!currentUserWeight || currentUserWeight <= 0) {
             displayMessage(activityAddMessage, 'Please set your weight in "Profile" for accurate calorie calculation.', 'error');
             return;
        }


        const activityData = {
            activity_id: parseInt(activityId), // activity_id is needed for both add and update
            duration_minutes: duration,
            calories_burnt: caloriesBurnt,
            activity_date: formatDate(currentDisplayDate) // activity_date is only needed for ADD
        };

        let response;
        let result;

        try {
            if (editingActivityId) {
                // --- Update existing activity ---
                 // For update, we send activity_id, duration_minutes, and calories_burnt
                 const updateData = {
                     activity_id: parseInt(activityId),
                     duration_minutes: duration,
                     calories_burnt: caloriesBurnt
                 };
                response = await updateActivity(editingActivityId, updateData); // Use updateActivity API function
            } else {
                // --- Add new activity ---
                response = await apiAddActivity(activityData); // Use apiAddActivity API function
            }

             // Check if response is valid before parsing
            if (!response) {
                 displayMessage(activityAddMessage, `Failed to ${editingActivityId ? 'update' : 'add'} activity (Authentication error).`, 'error');
                 return; // Stop execution
            }
            result = await response.json();

            if (response.ok) {
                displayMessage(activityAddMessage, result.message, 'success');
                resetActivityForm(); // Clear form and reset to add mode
                fetchDailyActivities(formatDate(currentDisplayDate)); // Refresh log
            } else {
                displayMessage(activityAddMessage, result.message || `Failed to ${editingActivityId ? 'update' : 'add'} activity.`, 'error');
            }
        } catch (error) {
            console.error(`Error ${editingActivityId ? 'updating' : 'adding'} activity:`, error);
            displayMessage(activityAddMessage, `An error occurred while ${editingActivityId ? 'updating' : 'adding'} activity.`, 'error');
        }
    }

    // --- Start Editing an Activity ---
    function startEditActivity(activity) {
        editingActivityId = activity.id; // Set the ID of the activity entry being edited

        // Populate the form with activity data
        activityTypeSelect.value = activity.activity_id; // Select the correct activity type
        durationMinutesInput.value = activity.duration_minutes;
        // Recalculate estimated calories for the populated duration and selected type
        calculateEstimatedCalories();

        // Change button text and show cancel button
        addActivityBtn.textContent = 'Update Activity';
        cancelActivityEditBtn.style.display = 'inline-block';

        // Disable activity type select when editing (user can only change duration)
        // Note: Backend PUT allows changing activity_id, but frontend UI simplifies to duration edit for now.
        // If you want to allow changing activity type during edit, remove this line.
        activityTypeSelect.disabled = true;


        clearMessage(activityAddMessage); // Clear any previous form messages
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
    }


    // --- Delete Activity Functionality ---
    async function deleteActivity(activityId) {
         if (!confirm('Are you sure you want to delete this activity entry?')) {
             return; // User cancelled
         }
        clearMessage(activityAddMessage); // Clear messages before deleting

        try {
            // Use the imported apiDeleteActivity function
            const response = await apiDeleteActivity(activityId);
            // Check if response is valid before parsing
            if (!response) {
                 displayMessage(activityAddMessage, 'Failed to delete activity (Authentication error).', 'error');
                 return; // Stop execution
            }
            const result = await response.json();

            if (response.ok) {
                displayMessage(activityAddMessage, result.message, 'success');
                fetchDailyActivities(formatDate(currentDisplayDate)); // Refresh the log
                 // If the deleted activity was being edited, reset the form
                 if (editingActivityId === activityId) {
                     resetActivityForm();
                 }
            } else {
                console.error('Failed to delete activity:', result.message);
                 displayMessage(activityAddMessage, result.message || 'Failed to delete activity.', 'error');
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
             displayMessage(activityAddMessage, 'An error occurred while deleting activity.', 'error');
        }
    }

    // --- Add Event Listeners for Edit and Delete Buttons (Delegation) ---
    // Use event delegation on the activityLogDiv to handle clicks on dynamically added buttons
    activityLogDiv.addEventListener('click', (e) => {
        const target = e.target;

        // Check if the clicked element is an Edit button
        if (target.classList.contains('edit-activity-btn')) {
            const activityId = parseInt(target.dataset.id);
            // Find the activity data from the currently displayed list
            const activityToEdit = currentDailyActivities.find(activity => activity.id === activityId);
            if (activityToEdit) {
                startEditActivity(activityToEdit);
            } else {
                 console.error('Activity data not found for editing:', activityId);
                 displayMessage(activityAddMessage, 'Error finding activity data for editing.', 'error');
            }
        }

        // Check if the clicked element is a Delete button
        if (target.classList.contains('delete-activity-btn')) {
            const activityId = parseInt(target.dataset.id);
            deleteActivity(activityId);
        }
    });


    // --- Fetch and Display Daily Activities ---
    async function fetchDailyActivities(date) {
        activityLogDiv.innerHTML = '<p class="info-message">Loading activities...</p>';
        totalDailyCaloriesBurntSpan.textContent = '0';
        currentDailyActivities = []; // Clear previous data

        try {
            const response = await getDailyActivitySummary(date); // Use API function

            // Check if response is valid before parsing
            if (!response) {
                 displayMessage(activityAddMessage, 'Failed to load activities (Authentication error).', 'error');
                 activityLogDiv.innerHTML = ''; // Clear loading message
                 return; // Stop execution
            }

            if (response.ok) {
                const data = await response.json(); // data should contain { activities: [...], totalCaloriesBurnt: number }
                currentDailyActivities = data.activities; // Store the fetched activities
                renderActivityLog(currentDailyActivities); // Render using the stored data
                totalDailyCaloriesBurntSpan.textContent = data.totalCaloriesBurnt !== null ? data.totalCaloriesBurnt.toFixed(1) : '0';
            } else {
                let errorData;
                try {
                    errorData = await response.json(); // Try to parse error as JSON
                } catch (jsonError) {
                     errorData = { message: `Server error: ${response.status} ${response.statusText}` };
                     console.error('Failed to parse error response as JSON. Raw response:', await response.text());
                }

                displayMessage(activityAddMessage, errorData.message || 'Error loading activities from server.', 'error');
                activityLogDiv.innerHTML = '<p class="error-message">Error loading activities.</p>'; // Clear "Loading activities..."
                console.error('Failed to fetch daily activities:', errorData.message);
                 totalDailyCaloriesBurntSpan.textContent = '0'; // Reset total on error
            }
        } catch (error) {
            console.error('Error fetching daily activities:', error);
            displayMessage(activityAddMessage, 'An error occurred loading activities.', 'error');
            activityLogDiv.innerHTML = '<p class="error-message">An error occurred loading activities.</p>'; // Clear "Loading activities..."
             totalDailyCaloriesBurntSpan.textContent = '0'; // Reset total on error
        }
    }

    function renderActivityLog(activities) {
        activityLogDiv.innerHTML = ''; // Clear existing log

        if (!Array.isArray(activities) || activities.length === 0) {
            activityLogDiv.innerHTML = '<p class="info-message">No activities logged for this day.</p>';
            return;
        }

        activities.forEach(activity => {
            const activityItemDiv = document.createElement('div');
            activityItemDiv.classList.add('activity-item', 'card'); // Add card class for styling
            // Ensure values are numbers using parseFloat (backend should send numbers, but safeguard)
            const duration = parseFloat(activity.duration_minutes);
            const calories = parseFloat(activity.calories_burnt);

            activityItemDiv.innerHTML = `
                <div class="activity-details">
                    <p><strong>${activity.activity_name}</strong> - ${duration.toFixed(1)} mins</p>
                    <p>${calories.toFixed(1)} kcal burnt</p>
                </div>
                <div class="actions">
                    <button class="primary-button-sm edit-activity-btn" data-id="${activity.id}">Edit</button>
                    <button class="secondary-button delete-activity-btn" data-id="${activity.id}">Delete</button>
                </div>
            `;
            activityLogDiv.appendChild(activityItemDiv);
        });
        // Event delegation handles clicks, no need to add listeners per button here
    }

    // Initialize the tracker
    initActivityTracker();
});
