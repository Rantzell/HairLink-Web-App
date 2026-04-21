/**
 * Recipient Confirmation Script
 * 
 * This page now uses server-side rendering for instant loading.
 * This script only handles minor UI enhancements if needed.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Reveal content immediately after DOM is ready
    const mainContent = document.getElementById('confirmationContent');
    if (mainContent) {
        mainContent.classList.add('reveal-after-load');
    }
});
