// frontend/js/meal_tracker.js
// Import API functions, renaming addMeal and deleteMeal to avoid conflict
import { searchFoods, addMeal as apiAddMeal, getDailyMealSummary, deleteMeal as apiDeleteMeal, updateMeal } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // dashboard_common.js handles token check and sidebar/logout

    // Date navigation elements
    const mealDateInput = document.getElementById('mealDateInput');
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');

    // Food search elements
    const foodSearchInput = document.getElementById('foodSearchInput');
    const foodSearchResults = document.getElementById('foodSearchResults');
    const foodSearchMessage = document.getElementById('foodSearchMessage'); // Message area for search

    // Add/Edit meal elements
    const selectedFoodIdInput = document.getElementById('selectedFoodId'); // Hidden input for selected food ID
    const selectedFoodNameSpan = document.getElementById('selectedFoodName'); // Span to display selected food name
    const gramsInput = document.getElementById('gramsInput');
    const mealTypeSelect = document.getElementById('mealTypeSelect');
    const addMealBtn = document.getElementById('addMealBtn'); // This button will become "Update Meal" in edit mode
    const cancelMealEditBtn = document.getElementById('cancelMealEditBtn'); // Button to cancel editing
    const mealAddMessage = document.getElementById('mealAddMessage'); // Message area for adding/editing meal

    // Daily meal log elements
    const mealLogDiv = document.getElementById('mealLog');
    const totalCaloriesSpan = document.getElementById('totalCalories');
    const totalProteinSpan = document.getElementById('totalProtein');
    const totalCarbsSpan = document.getElementById('totalCarbs');
    const totalFatSpan = document.getElementById('totalFat');

    let currentDisplayDate = new Date(); // Tracks the date currently being displayed
    let editingMealId = null; // Stores the ID of the meal being edited (null when adding)

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
        mealDateInput.value = formatDate(currentDisplayDate); // Display in input
        fetchDailyMeals(formatDate(currentDisplayDate)); // Fetch meals for this date
    }

     // Function to clear the add/edit meal form and reset to 'Add' mode
    function resetMealForm() {
        editingMealId = null; // No meal is being edited
        selectedFoodIdInput.value = '';
        selectedFoodNameSpan.textContent = 'None selected';
        foodSearchInput.value = '';
        foodSearchResults.innerHTML = '';
        gramsInput.value = '';
        mealTypeSelect.value = 'Breakfast'; // Reset to default
        addMealBtn.textContent = 'Add Meal'; // Change button text back
        cancelMealEditBtn.style.display = 'none'; // Hide cancel button
        clearMessage(mealAddMessage); // Clear form messages
        // Re-enable food search inputs if they were disabled during edit
        foodSearchInput.disabled = false;
         document.querySelectorAll('.select-food-btn').forEach(btn => btn.disabled = false);
    }


    // --- Event Listeners for Date Navigation ---
    mealDateInput.addEventListener('change', (e) => {
        // Ensure the date is valid before setting
        if (e.target.value) {
             setDisplayDate(new Date(e.target.value));
        }
    });

    prevDayBtn.addEventListener('click', () => {
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() - 1);
        setDisplayDate(newDate);
    });

    nextDayBtn.addEventListener('click', () => {
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() + 1);
        setDisplayDate(newDate);
    });

    // --- Food Search Functionality ---
    foodSearchInput.addEventListener('input', () => {
        const searchTerm = foodSearchInput.value.trim();
        searchFoodsAndDisplay(searchTerm);
    });

    async function searchFoodsAndDisplay(searchTerm) {
        clearMessage(foodSearchMessage); // Clear previous search messages
        foodSearchResults.innerHTML = ''; // Clear previous results
        // Only clear selected food if not in edit mode, or if the search term is empty
        if (!editingMealId || searchTerm === '') {
             selectedFoodIdInput.value = ''; // Clear selected food
             selectedFoodNameSpan.textContent = 'None selected'; // Reset selected food display
        }


        if (searchTerm.length < 2) {
            foodSearchResults.innerHTML = '<p class="info-message">Type at least 2 characters to search.</p>';
            return;
        }

        try {
            const response = await searchFoods(searchTerm); // Use API function
             // Check if response is valid before parsing
            if (!response) {
                 displayMessage(foodSearchMessage, 'Failed to search foods (Authentication error).', 'error');
                 return; // Stop execution
            }
            const data = await response.json();

            if (response.ok) {
                renderSearchResults(data);
            } else {
                displayMessage(foodSearchMessage, data.message || 'Error searching foods.', 'error');
            }
        } catch (error) {
            console.error('Error searching food:', error);
            displayMessage(foodSearchMessage, 'An error occurred during search.', 'error');
        }
    }

    function renderSearchResults(foods) {
        foodSearchResults.innerHTML = ''; // Clear previous results

        if (!Array.isArray(foods) || foods.length === 0) {
            foodSearchResults.innerHTML = '<p class="info-message">No foods found.</p>';
            return;
        }

        foods.forEach(food => {
            const foodItemDiv = document.createElement('div');
            foodItemDiv.classList.add('food-search-item');
            foodItemDiv.innerHTML = `
                <span>${food.name}</span>
                <button class="select-food-btn primary-button-sm"
                        data-id="${food.id}"
                        data-name="${food.name}">Select</button>
            `;
            foodSearchResults.appendChild(foodItemDiv);
        });

        // Add event listeners to "Select" buttons
        document.querySelectorAll('.select-food-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const foodId = e.target.dataset.id;
                const foodName = e.target.dataset.name;
                selectedFoodIdInput.value = foodId;
                selectedFoodNameSpan.textContent = foodName;
                foodSearchResults.innerHTML = ''; // Clear results after selection
                foodSearchInput.value = foodName; // Put selected name into search bar
                clearMessage(foodSearchMessage); // Clear any search messages
            });
        });
    }

    // --- Add/Update Meal Functionality ---
    addMealBtn.addEventListener('click', handleAddOrUpdateMeal);
    cancelMealEditBtn.addEventListener('click', resetMealForm); // Add listener for cancel button

    async function handleAddOrUpdateMeal() {
        clearMessage(mealAddMessage); // Clear previous add/edit meal messages

        const food_id = selectedFoodIdInput.value;
        const grams = parseFloat(gramsInput.value);
        const meal_date = formatDate(currentDisplayDate);
        const meal_type = mealTypeSelect.value;

        if (!food_id || isNaN(grams) || grams <= 0 || !meal_type) {
            displayMessage(mealAddMessage, 'Please select a food, enter valid grams, and choose a meal type.', 'error');
            return;
        }

        const mealData = {
            food_id: parseInt(food_id), // food_id is only needed for ADD, but included here for consistency
            grams: grams,
            meal_date: meal_date, // meal_date is only needed for ADD, but included here for consistency
            meal_type: meal_type
        };

        let response;
        let result;

        try {
            if (editingMealId) {
                // --- Update existing meal ---
                 // For update, we only send grams and meal_type
                 const updateData = {
                     grams: grams,
                     meal_type: meal_type
                 };
                response = await updateMeal(editingMealId, updateData); // Use updateMeal API function
            } else {
                // --- Add new meal ---
                response = await apiAddMeal(mealData); // Use apiAddMeal API function
            }

             // Check if response is valid before parsing
            if (!response) {
                 displayMessage(mealAddMessage, `Failed to ${editingMealId ? 'update' : 'add'} meal (Authentication error).`, 'error');
                 return; // Stop execution
            }
            result = await response.json();

            if (response.ok) {
                displayMessage(mealAddMessage, result.message, 'success');
                resetMealForm(); // Clear form and reset to add mode
                fetchDailyMeals(formatDate(currentDisplayDate)); // Refresh the meal log
            } else {
                displayMessage(mealAddMessage, result.message || `Failed to ${editingMealId ? 'update' : 'add'} meal.`, 'error');
            }
        } catch (error) {
            console.error(`Error ${editingMealId ? 'updating' : 'adding'} meal:`, error);
            displayMessage(mealAddMessage, `An error occurred while ${editingMealId ? 'updating' : 'adding'} meal.`, 'error');
        }
    }

    // --- Start Editing a Meal ---
    function startEditMeal(meal) {
        editingMealId = meal.id; // Set the ID of the meal being edited

        // Populate the form with meal data
        selectedFoodIdInput.value = meal.food_id;
        selectedFoodNameSpan.textContent = meal.food_name;
        foodSearchInput.value = meal.food_name; // Put name in search input
        gramsInput.value = meal.grams;
        mealTypeSelect.value = meal.meal_type;

        // Change button text and show cancel button
        addMealBtn.textContent = 'Update Meal';
        cancelMealEditBtn.style.display = 'inline-block';

        // Disable food search inputs when editing (user can only change grams/type)
        foodSearchInput.disabled = true;
        foodSearchResults.innerHTML = ''; // Clear search results
         document.querySelectorAll('.select-food-btn').forEach(btn => btn.disabled = true);


        clearMessage(mealAddMessage); // Clear any previous form messages
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
    }


    // --- Delete Meal Functionality ---
    async function deleteMeal(mealId) {
         if (!confirm('Are you sure you want to delete this meal entry?')) {
             return; // User cancelled
         }
        clearMessage(mealAddMessage); // Clear messages before deleting

        try {
            // Use the imported apiDeleteMeal function
            const response = await apiDeleteMeal(mealId);
            // Check if response is valid before parsing
            if (!response) {
                 displayMessage(mealAddMessage, 'Failed to delete meal (Authentication error).', 'error');
                 return; // Stop execution
            }
            const result = await response.json();

            if (response.ok) {
                displayMessage(mealAddMessage, result.message, 'success');
                fetchDailyMeals(formatDate(currentDisplayDate)); // Refresh the meal log
                 // If the deleted meal was being edited, reset the form
                 if (editingMealId === mealId) {
                     resetMealForm();
                 }
            } else {
                console.error('Failed to delete meal:', result.message);
                 displayMessage(mealAddMessage, result.message || 'Failed to delete meal.', 'error');
            }
        } catch (error) {
            console.error('Error deleting meal:', error);
             displayMessage(mealAddMessage, 'An error occurred while deleting meal.', 'error');
        }
    }

    // --- Add Event Listeners for Edit and Delete Buttons (Delegation) ---
    // Use event delegation on the mealLogDiv to handle clicks on dynamically added buttons
    mealLogDiv.addEventListener('click', (e) => {
        const target = e.target;

        // Check if the clicked element is an Edit button
        if (target.classList.contains('edit-meal-btn')) {
            const mealId = parseInt(target.dataset.id);
            // Find the meal data from the currently displayed list (more efficient than re-fetching)
            const mealToEdit = getMealDataById(mealId);
            if (mealToEdit) {
                startEditMeal(mealToEdit);
            } else {
                 console.error('Meal data not found for editing:', mealId);
                 displayMessage(mealAddMessage, 'Error finding meal data for editing.', 'error');
            }
        }

        // Check if the clicked element is a Delete button
        if (target.classList.contains('delete-meal-btn')) {
            const mealId = parseInt(target.dataset.id);
            deleteMeal(mealId);
        }
    });

    // Helper to find meal data by ID from the current list
    function getMealDataById(mealId) {
         // This assumes the meals data is stored somewhere accessible,
         // like within the renderMealLog function's scope or a global variable.
         // For simplicity here, we'll assume the meal data was stored when fetched.
         // A better approach would be to store the fetched meals in a variable
         // accessible to this function. Let's modify fetchDailyMeals to store it.

         // Re-fetching the list and then finding the meal is also an option,
         // but less efficient if the list is large.

         // Let's modify fetchDailyMeals to store the data in a variable.
         // For now, we'll add a placeholder comment here, and the actual
         // implementation needs the data to be stored.
         console.warn("getMealDataById needs access to the fetched meals data.");
         // Placeholder: In a real app, you'd return the meal object from a stored array.
         // Example: return fetchedMealsArray.find(meal => meal.id === mealId);
         // For now, we'll rely on re-fetching or assuming data is available.

         // A quick fix: re-fetch the daily meals and find the one to edit
         // This is inefficient but works if storing the list is complex.
         // Let's add a simple re-fetch here for demonstration, but storing is better.

         // *** Update: The renderMealLog function now stores the fetched meals in a variable `currentDailyMeals`. Let's use that. ***
         return currentDailyMeals.find(meal => meal.id === mealId);

    }

    // --- Fetch and Display Daily Meals ---
    let currentDailyMeals = []; // Variable to store the fetched daily meals

    async function fetchDailyMeals(date) {
        mealLogDiv.innerHTML = '<p class="info-message">Loading meals...</p>';
        // Reset totals while loading
        totalCaloriesSpan.textContent = '0';
        totalProteinSpan.textContent = '0';
        totalCarbsSpan.textContent = '0';
        totalFatSpan.textContent = '0';
        currentDailyMeals = []; // Clear previous data

        try {
            const response = await getDailyMealSummary(date); // Use API function

            // Check if response is valid before parsing
            if (!response) {
                 displayMessage(mealAddMessage, 'Failed to load meals (Authentication error).', 'error');
                 mealLogDiv.innerHTML = ''; // Clear loading message
                 return; // Stop execution
            }

            if (response.ok) {
                const data = await response.json(); // data should contain { meals: [...], totals: {...} }
                currentDailyMeals = data.meals; // Store the fetched meals
                renderMealLog(currentDailyMeals); // Render using the stored data
                updateDailyTotals(data.totals);
            } else {
                let errorData;
                try {
                    errorData = await response.json(); // Try to parse error as JSON
                } catch (jsonError) {
                    // If response is not JSON (e.g., HTML from a 404), create a generic error message
                    errorData = { message: `Server error: ${response.status} ${response.statusText}` };
                    console.error('Failed to parse error response as JSON. Raw response:', await response.text());
                }

                displayMessage(mealAddMessage, errorData.message || 'Error loading meals from server.', 'error');
                mealLogDiv.innerHTML = '<p class="error-message">Error loading meals.</p>'; // Clear "Loading meals..."
                console.error('Failed to fetch daily meals:', errorData.message);
                // Reset totals on error
                 totalCaloriesSpan.textContent = '0';
                 totalProteinSpan.textContent = '0';
                 totalCarbsSpan.textContent = '0';
                 totalFatSpan.textContent = '0';
            }
        } catch (error) {
            console.error('Error fetching daily meals:', error);
            displayMessage(mealAddMessage, 'An error occurred while fetching meals.', 'error');
            mealLogDiv.innerHTML = '<p class="error-message">An error occurred loading meals.</p>'; // Clear "Loading meals..."
            // Reset totals on error
            totalCaloriesSpan.textContent = '0';
            totalProteinSpan.textContent = '0';
            totalCarbsSpan.textContent = '0';
            totalFatSpan.textContent = '0';
        }
    }

    function renderMealLog(meals) {
        mealLogDiv.innerHTML = ''; // Clear existing log

        // Ensure meals is an array before trying to access .length
        if (!Array.isArray(meals) || meals.length === 0) {
            mealLogDiv.innerHTML = '<p class="info-message">No meals logged for this day.</p>';
            return;
        }

        // Group meals by type (Breakfast, Lunch, etc.)
        const groupedMeals = meals.reduce((acc, meal) => {
            if (!acc[meal.meal_type]) {
                acc[meal.meal_type] = [];
            }
            acc[meal.meal_type].push(meal);
            return acc;
        }, {});

        // Define a preferred order for meal types
        const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
        const sortedMealTypes = Object.keys(groupedMeals).sort((a, b) => {
            const indexA = mealOrder.indexOf(a);
            const indexB = mealOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b); // Alphabetical if not in order
            if (indexA === -1) return 1; // a comes after b if a is not in order
            if (indexB === -1) return -1; // b comes after a if b is not in order
            return indexA - indexB; // Sort by preferred order
        });


        sortedMealTypes.forEach(mealType => {
             if (groupedMeals[mealType] && groupedMeals[mealType].length > 0) {
                const mealTypeDiv = document.createElement('div');
                mealTypeDiv.classList.add('meal-type-group', 'card'); // Add card class for styling
                mealTypeDiv.innerHTML = `<h3>${mealType}</h3>`;

                groupedMeals[mealType].forEach(meal => {
                    const mealItemDiv = document.createElement('div');
                    mealItemDiv.classList.add('meal-item');
                    // Ensure values are numbers using parseFloat (backend should send numbers, but this is a safeguard)
                    const calories = parseFloat(meal.calories);
                    const protein = parseFloat(meal.protein);
                    const carbs = parseFloat(meal.carbs);
                    const fat = parseFloat(meal.fat);
                    const grams = parseFloat(meal.grams);

                    mealItemDiv.innerHTML = `
                        <div class="meal-details">
                            <p><strong>${meal.food_name}</strong> - ${grams.toFixed(1)}g</p>
                            <p>Calories: ${calories.toFixed(1)} kcal | Protein: ${protein.toFixed(1)}g | Carbs: ${carbs.toFixed(1)}g | Fat: ${fat.toFixed(1)}g</p>
                        </div>
                        <div class="actions">
                            <button class="primary-button-sm edit-meal-btn" data-id="${meal.id}">Edit</button>
                            <button class="secondary-button delete-meal-btn" data-id="${meal.id}">Delete</button>
                        </div>
                    `;
                    mealTypeDiv.appendChild(mealItemDiv);
                });
                mealLogDiv.appendChild(mealTypeDiv);
            }
        });
    }

    function updateDailyTotals(totals) {
        // Ensure totals object and its properties exist before accessing
        totalCaloriesSpan.textContent = totals && totals.totalCalories !== null ? totals.totalCalories.toFixed(1) : '0';
        totalProteinSpan.textContent = totals && totals.totalProtein !== null ? totals.totalProtein.toFixed(1) : '0';
        totalCarbsSpan.textContent = totals && totals.totalCarbs !== null ? totals.totalCarbs.toFixed(1) : '0';
        totalFatSpan.textContent = totals && totals.totalFat !== null ? totals.totalFat.toFixed(1) : '0';
    }


    // Initialize with today's date when the page loads
    setDisplayDate(new Date());
});
