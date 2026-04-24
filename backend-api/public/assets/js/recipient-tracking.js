document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-requests');
    const requestsList = document.getElementById('requests-list');

    /**
     * Get status pill CSS class
     */
    function getStatusClass(status) {
        const statusMap = {
            'Submitted': 'status-submitted',
            'Under Review': 'status-reviewing',
            'Matched': 'status-matched',
            'Ready for Pickup': 'status-approved',
            'Completed': 'status-approved'
        };
        return statusMap[status] || 'status-pending';
    }

    /**
     * Render requests table
     */
    async function renderRequests(filter = '') {
        let requests = [];
        try {
            requests = await window.hairlinkRecipientModule.getRequests();
        } catch (error) {
            console.error('Error fetching requests:', error);
        }

        let filteredRequests = requests;
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            filteredRequests = requests.filter(r => 
                r.reference.toLowerCase().includes(lowerFilter) ||
                r.status.toLowerCase().includes(lowerFilter) ||
                (r.fullName && r.fullName.toLowerCase().includes(lowerFilter))
            );
        }

        requestsList.innerHTML = '';

        if (filteredRequests.length === 0) {
            requestsList.innerHTML = `
                <tr class="empty-state">
                    <td colspan="5">
                        ${filter ? 'No requests found matching your search.' : 'No requests found.'}
                        <a href="/recipient/request">Submit your first request</a>
                    </td>
                </tr>
            `;
            return;
        }

        filteredRequests.forEach(request => {
            const row = document.createElement('tr');
            const submittedDate = window.hairlinkRecipientModule.formatDate(request.createdAt);
            const statusClass = getStatusClass(request.status);
            const userName = request.fullName || (request.user ? request.user.name : 'Recipient');

            row.innerHTML = `
                <td><strong>${request.reference}</strong></td>
                <td>${submittedDate}</td>
                <td><span class="status-pill ${statusClass}">${request.status}</span></td>
                <td>${userName}</td>
                <td>
                    <a href="/recipient/tracking/${request.reference}" class="action-link">
                        View Details
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </a>
                </td>
            `;

            requestsList.appendChild(row);
        });
    }

    /**
     * Handle search input
     */
    function handleSearch(e) {
        renderRequests(e.target.value);
    }

    // Initial render
    renderRequests();

    // Event listener
    searchInput.addEventListener('input', handleSearch);
});
