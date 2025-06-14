// frontend/js/wellness_videos.js
import { authenticatedFetch } from './api.js'; // Import authenticatedFetch

document.addEventListener('DOMContentLoaded', async () => {
    // dashboard_common.js handles token check and sidebar/logout

    const wellnessVideosListDiv = document.getElementById('wellnessVideosList');
    const wellnessVideosMessage = document.getElementById('wellnessVideosMessage'); // Message area

     // Helper function to display messages
    function displayMessage(message, type) {
        wellnessVideosMessage.textContent = message;
        wellnessVideosMessage.className = `message ${type}-message`;
        wellnessVideosMessage.classList.remove('hidden');
         // Optional: Hide message after a few seconds
        // setTimeout(() => {
        //     wellnessVideosMessage.classList.add('hidden');
        // }, 3000);
    }

     function clearMessage() {
         wellnessVideosMessage.textContent = '';
         wellnessVideosMessage.classList.add('hidden');
    }


    // Function to fetch and display wellness videos
    async function fetchAndDisplayWellnessVideos() {
        wellnessVideosListDiv.innerHTML = '<p class="info-message">Loading videos...</p>';
        clearMessage(); // Clear previous messages

        try {
            // Use authenticatedFetch to call the backend API
            const response = await authenticatedFetch('/wellness', { method: 'GET' }); // Assuming the endpoint is /api/wellness
            const videos = await response.json();

            if (response.ok) {
                renderWellnessVideos(videos); // Render the list of videos
            } else {
                displayMessage(videos.message || 'Failed to load videos.', 'error');
                console.error('Failed to fetch wellness videos:', videos.message);
                 wellnessVideosListDiv.innerHTML = ''; // Clear loading message on error
            }
        } catch (error) {
            console.error('Error fetching wellness videos:', error);
            displayMessage('An error occurred while loading videos.', 'error');
             wellnessVideosListDiv.innerHTML = ''; // Clear loading message on error
        }
    }

    // Function to render the list of wellness videos, grouped by type
    function renderWellnessVideos(videos) {
        wellnessVideosListDiv.innerHTML = ''; // Clear existing list

        if (!Array.isArray(videos) || videos.length === 0) {
            wellnessVideosListDiv.innerHTML = '<p class="info-message">No wellness videos found.</p>';
            return;
        }

        // Group videos by type
        const groupedVideos = videos.reduce((acc, video) => {
            if (!acc[video.type]) {
                acc[video.type] = [];
            }
            acc[video.type].push(video);
            return acc;
        }, {});

        // Define a preferred order for video types
        const typeOrder = ['Meditation', 'Yoga', 'Breathing'];
        const sortedTypes = Object.keys(groupedVideos).sort((a, b) => {
             const indexA = typeOrder.indexOf(a);
             const indexB = typeOrder.indexOf(b);
             if (indexA === -1 && indexB === -1) return a.localeCompare(b); // Alphabetical if not in order
             if (indexA === -1) return 1; // a comes after b if a is not in order
             if (indexB === -1) return -1; // b comes after a if b is not in order
             return indexA - indexB; // Sort by preferred order
        });


        sortedTypes.forEach(type => {
            if (groupedVideos[type] && groupedVideos[type].length > 0) {
                const typeGroupDiv = document.createElement('div');
                typeGroupDiv.classList.add('video-type-group');
                typeGroupDiv.innerHTML = `<h3>${type}</h3>`;

                groupedVideos[type].forEach(video => {
                    const videoItemDiv = document.createElement('div');
                    videoItemDiv.classList.add('video-item', 'card'); // Add card class for styling

                    videoItemDiv.innerHTML = `
                        <h4>${video.title}</h4>
                        ${video.description ? `<p>${video.description}</p>` : ''}
                        ${video.youtube_link ? `<p class="video-link"><a href="${video.youtube_link}" target="_blank">Watch Video</a></p>` : ''}
                    `;
                    typeGroupDiv.appendChild(videoItemDiv);
                });
                wellnessVideosListDiv.appendChild(typeGroupDiv);
            }
        });
    }

    // Fetch wellness videos when the page loads
    fetchAndDisplayWellnessVideos();
});
