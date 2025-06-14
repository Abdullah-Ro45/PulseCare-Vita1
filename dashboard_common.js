// frontend/js/dashboard_common.js

document.addEventListener('DOMContentLoaded', () => {
    // Check for token on page load
    const token = localStorage.getItem('token');
    if (!token) {
        // If no token, redirect to login page
        window.location.href = 'index.html';
        return; // Stop execution
    }

    // Get sidebar and main content elements
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content'); // Assuming main content has this class

    // Get the toggle button and logout button
    const sidebarToggle = document.getElementById('sidebarToggle');
    const logoutButton = document.getElementById('logoutButton');

    // --- Sidebar Toggle Functionality ---

    // Initial state: Sidebar is hidden by default on page load
    // We apply the 'hidden' class to the sidebar and 'sidebar-hidden' to main content initially
    sidebar.classList.add('hidden');
    mainContent.classList.add('sidebar-hidden');


    // Add event listener to the toggle button
    sidebarToggle.addEventListener('click', () => {
        // Toggle the 'hidden' class on the sidebar
        sidebar.classList.toggle('hidden');
        // Toggle the 'sidebar-hidden' class on the main content
        mainContent.classList.toggle('sidebar-hidden');
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            // Clear token and user data from local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // Assuming user object is also stored

            // Redirect to login page
            window.location.href = 'index.html';
        });
    }

    // Optional: Close sidebar when clicking outside it on mobile (more advanced)
    // This would require checking screen size and adding a click listener to the main content
    // when the sidebar is open on small screens.
});
