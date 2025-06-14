// frontend/js/bmi_calculator.js
import { getUserProfile } from './api.js'; // Import API function

document.addEventListener('DOMContentLoaded', async () => {
    // dashboard_common.js handles token check and sidebar/logout

    // Get form elements
    const weightInput = document.getElementById('weightInput');
    const heightInput = document.getElementById('heightInput');
    const calculateBmiBtn = document.getElementById('calculateBmiBtn');
    const bmiMessage = document.getElementById('bmiMessage'); // Message area

    // Get result elements
    const bmiResultSection = document.getElementById('bmiResultSection');
    const bmiValueSpan = document.getElementById('bmiValue');
    const bmiCategorySpan = document.getElementById('bmiCategory');

     // Helper function to display messages
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


    // Function to fetch user profile and pre-fill form
    async function fetchAndPreFillProfile() {
        try {
            const response = await getUserProfile(); // Use API function
            const profileData = await response.json();

            if (response.ok) {
                // Pre-fill weight and height if available in profile
                if (profileData.current_weight !== null) {
                    weightInput.value = profileData.current_weight;
                }
                if (profileData.height !== null) {
                    heightInput.value = profileData.height;
                }

                // If both are available, calculate BMI automatically on load
                if (profileData.current_weight !== null && profileData.height !== null) {
                    calculateBMI(profileData.current_weight, profileData.height);
                }

            } else {
                console.error('Failed to fetch profile for BMI:', profileData.message);
                displayMessage(bmiMessage, profileData.message || 'Could not load profile data.', 'info');
            }
        } catch (error) {
            console.error('Error fetching profile for BMI:', error);
            displayMessage(bmiMessage, 'An error occurred while loading profile data.', 'info');
        }
    }

    // Function to calculate BMI
    function calculateBMI(weightKg, heightCm) {
        // BMI formula: weight (kg) / (height (m))^2
        const heightM = heightCm / 100; // Convert height from cm to meters
        if (weightKg > 0 && heightM > 0) {
            const bmi = weightKg / (heightM * heightM);
            return bmi.toFixed(2); // Return BMI rounded to 2 decimal places
        }
        return null; // Return null if inputs are invalid
    }

    // Function to determine BMI category
    function getBMICategory(bmi) {
        if (bmi === null) return '--';
        if (bmi < 18.5) return 'Underweight';
        if (bmi >= 18.5 && bmi < 25) return 'Normal weight';
        if (bmi >= 25 && bmi < 30) return 'Overweight';
        if (bmi >= 30) return 'Obesity';
        return '--'; // Should not happen
    }

    // Handle Calculate BMI button click
    calculateBmiBtn.addEventListener('click', () => {
        clearMessage(bmiMessage); // Clear previous messages
        bmiResultSection.classList.add('hidden'); // Hide previous result

        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value);

        if (isNaN(weight) || weight <= 0 || isNaN(height) || height <= 0) {
            displayMessage(bmiMessage, 'Please enter valid positive numbers for weight and height.', 'error');
            return;
        }

        const bmi = calculateBMI(weight, height);
        const category = getBMICategory(bmi);

        if (bmi !== null) {
            bmiValueSpan.textContent = bmi;
            bmiCategorySpan.textContent = category;
            bmiResultSection.classList.remove('hidden'); // Show the result section
        } else {
            displayMessage(bmiMessage, 'Could not calculate BMI. Please check your inputs.', 'error');
        }
    });

    // Fetch profile data to pre-fill form on page load
    fetchAndPreFillProfile();
});
