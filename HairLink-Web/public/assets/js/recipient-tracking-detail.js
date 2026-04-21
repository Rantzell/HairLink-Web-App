document.addEventListener('DOMContentLoaded', function() {
    const root = document.getElementById('trackingDetailContent');
    const timeline = document.getElementById('request-timeline');
    const simulateBtn = document.getElementById('simulateStatusBtn');
    const summaryStatusPill = document.getElementById('summary-status-pill');

    const recipientModule = window.hairlinkRecipientModule;
    if (!recipientModule) {
        console.warn('Recipient module not loaded, displaying server-side content.');
        return;
    }

    function getRequestReference() {
        return root?.dataset?.reference || ''; 
    }

    function timelineItemHtml(historyItem) {
        const status = historyItem.status || 'Unknown';
        const date = recipientModule.formatDateTime(historyItem.timestamp);
        let rawNote = historyItem.notes || `Status changed to ${status}`;
        
        // Remove tech prefixes
        const cleanNote = rawNote.includes(': ') ? rawNote.split(': ').pop() : rawNote;
        const safeNote = `message: ${cleanNote}`;

        return `
            <div class="timeline-item">
                <div class="timeline-meta">
                    <strong>${status}</strong>
                    <time>${date}</time>
                </div>
                <div class="timeline-desc">
                    ${safeNote}
                </div>
            </div>
        `;
    }

    async function refreshUI() {
        const reference = root.querySelector('#summary-reference').textContent.trim();
        let request;
        try {
            request = await recipientModule.getRequest(reference);
        } catch (error) {
            console.error('Error refreshing request:', error);
            return;
        }

        if (summaryStatusPill) {
            summaryStatusPill.textContent = request.status;
            summaryStatusPill.className = `status-pill status-${request.status.toLowerCase().replace(/\s+/g, '-')}`;
        }

        if (timeline) {
            const statusHistory = [...(request.statusHistory || [])].reverse();
            timeline.innerHTML = statusHistory.map(item => timelineItemHtml(item)).join('');
        }

        if (simulateBtn) {
            const currentIndex = recipientModule.STATUS_FLOW.indexOf(request.status);
            if (currentIndex >= 0 && currentIndex < recipientModule.STATUS_FLOW.length - 1) {
                const nextStatus = recipientModule.STATUS_FLOW[currentIndex + 1];
                simulateBtn.textContent = `Advance to: ${nextStatus}`;
                simulateBtn.disabled = false;
                simulateBtn.dataset.next = nextStatus;
            } else {
                simulateBtn.textContent = 'Request Complete';
                simulateBtn.disabled = true;
            }
        }
    }

    // We NO LONGER run loadRequest() on init.
    // The Blade gives us a perfect initial state.

    if (simulateBtn) {
        simulateBtn.addEventListener('click', async () => {
            simulateBtn.disabled = true;
            simulateBtn.textContent = 'Updating...';
            const reference = root.querySelector('#summary-reference').textContent.trim();
            try {
                await recipientModule.nextStatus(reference);
                await refreshUI();
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Failed to advance status. Please try again.');
                simulateBtn.disabled = false;
            }
        });
    }
});
