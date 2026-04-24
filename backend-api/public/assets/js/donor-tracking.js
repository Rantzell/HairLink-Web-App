function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
    const moduleApi = window.hairlinkDonorModule;
    if (!moduleApi) {
        return;
    }

    const tableBody = document.getElementById('trackingTableBody');
    const emptyState = document.getElementById('trackingEmpty');
    const filterInput = document.getElementById('trackingFilter');

    let donations = [];
    try {
        donations = await moduleApi.getAllDonations();
    } catch (error) {
        console.error('Error fetching donations:', error);
    }

    function renderRows(items) {
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '';
        if (items.length === 0) {
            if (emptyState) {
                emptyState.hidden = false;
            }
            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        items.forEach((donation) => {
            const statusClass = `status-${donation.currentStatus.toLowerCase()}`;
            const certText = donation.certificate ? 'Ready' : 'Pending';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${escapeHtml(donation.reference)}</strong></td>
                <td>${escapeHtml(moduleApi.formatDateTime(donation.submittedAt))}</td>
                <td><span class="status-pill ${statusClass}">${escapeHtml(donation.currentStatus)}</span></td>
                <td>${escapeHtml(donation.hairLength)}</td>
                <td>${escapeHtml(certText)}</td>
                <td>
                    <a class="action-link" href="/donor/tracking/${encodeURIComponent(donation.reference)}">
                        View Details
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </a>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    renderRows(donations);

    if (filterInput) {
        filterInput.addEventListener('input', () => {
            const keyword = filterInput.value.toLowerCase().trim();
            const filtered = donations.filter((donation) => {
                const source = [
                    donation.reference,
                    donation.currentStatus,
                    donation.hairLength,
                    donation.hairColor,
                    donation.fullName
                ].join(' ').toLowerCase();
                return source.includes(keyword);
            });

            renderRows(filtered);
        });
    }
});
