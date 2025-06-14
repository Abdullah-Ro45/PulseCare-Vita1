// frontend/js/progress_tracker.js
import { getWeightHistory } from './api.js'; // Import getWeightHistory API function

document.addEventListener('DOMContentLoaded', async () => {
    // dashboard_common.js handles token check and sidebar/logout

    const progressMessage = document.getElementById('progressMessage'); // Message area
    const weightHistoryChartCanvas = document.getElementById('weightHistoryChart'); // Get the canvas element
    let weightChartInstance = null; // To hold the Chart.js instance


    // Helper function to display messages
    function displayMessage(message, type) {
        progressMessage.textContent = message;
        progressMessage.className = `message ${type}-message`;
        progressMessage.classList.remove('hidden');
         // Optional: Hide message after a few seconds
        // setTimeout(() => {
        //     progressMessage.classList.add('hidden');
        // }, 3000);
    }

     function clearMessage() {
         progressMessage.textContent = '';
         progressMessage.classList.add('hidden');
    }


    // Function to fetch weight history
    async function fetchWeightHistory() {
        clearMessage(); // Clear previous messages
        try {
            // Use getWeightHistory API function
            const response = await getWeightHistory();
             // Check if response is valid before parsing
            if (!response) {
                 displayMessage('Failed to fetch weight history (Authentication error).', 'error');
                 return; // Stop execution
            }
            const data = await response.json();

            if (response.ok) {
                renderWeightChart(data); // Render the chart with the fetched data
            } else {
                displayMessage(data.message || 'Failed to fetch weight history.', 'error');
                console.error('Failed to fetch weight history:', data.message);
            }
        } catch (error) {
            console.error('Error fetching weight history:', error);
            displayMessage('An error occurred while fetching weight history.', 'error');
        }
    }

    // Function to render the weight history chart using Chart.js
    function renderWeightChart(weightData) {
        // Destroy previous chart instance if it exists
        if (weightChartInstance) {
            weightChartInstance.destroy();
        }

        if (!Array.isArray(weightData) || weightData.length === 0) {
            displayMessage('No weight history data available to display a chart.', 'info');
            // Optionally hide the canvas or display a placeholder
            weightHistoryChartCanvas.style.display = 'none';
            return;
        }

        // Show the canvas if it was hidden
        weightHistoryChartCanvas.style.display = 'block';


        // Sort data by date to ensure the chart is chronological
        weightData.sort((a, b) => new Date(a.record_date) - new Date(b.record_date));

        // Prepare data for Chart.js
        const dates = weightData.map(entry => {
             // Format date for display (e.g., MM/DD/YYYY)
             const date = new Date(entry.record_date);
             // Add 1 to month because getMonth() is 0-indexed
             return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        });
        const weights = weightData.map(entry => entry.weight);

        const ctx = weightHistoryChartCanvas.getContext('2d');

        // Create the new chart
        weightChartInstance = new Chart(ctx, {
            type: 'line', // Line chart for trends
            data: {
                labels: dates, // Dates on the X-axis
                datasets: [{
                    label: 'Weight (kg)',
                    data: weights, // Weights on the Y-axis
                    borderColor: 'rgba(75, 192, 192, 1)', // Line color
                    backgroundColor: 'rgba(75, 192, 192, 0.2)', // Area under the line color
                    tension: 0.1, // Smooth the line
                    fill: true // Fill the area under the line
                }]
            },
            options: {
                responsive: true, // Make chart responsive
                maintainAspectRatio: false, // Allow height to be controlled by CSS/container
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Weight (kg)'
                        },
                        beginAtZero: false // Start Y-axis from a relevant weight
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Weight Over Time'
                    }
                }
            }
        });
    }

    // Fetch weight history when the page loads
    fetchWeightHistory();
});
