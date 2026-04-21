document.addEventListener('DOMContentLoaded', () => {
    const trackingCards = document.querySelectorAll('[data-track-card]');
    const donorSteps = ['verified', 'received-hair', 'in-queue', 'in-progress', 'completed', 'wig-received'];
    const recipientSteps = ['validated', 'matched', 'in-transit', 'completed'];
    
    const labels = {
        'verified': 'Verified',
        'received-hair': 'Received Hair',
        'in-queue': 'In Queue',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'wig-received': 'Wig Received',
        'validated': 'Validated',
        'matched': 'Matched',
        'in-transit': 'In Transit'
    };

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    // ─── PAINT STAGE ROW (shared for both donor and recipient) ───
    function paintStages(card, status, steps) {
        const activeIndex = steps.indexOf(status);
        const stageItems = card.querySelectorAll('[data-stage]');
        const statusChip = card.querySelector('[data-status-chip]');

        if (statusChip) {
            statusChip.textContent = labels[status] || status;
        }

        stageItems.forEach((item, index) => {
            item.classList.remove('done', 'active');
            if (index < activeIndex) item.classList.add('done');
            if (index === activeIndex) item.classList.add('active');
        });

        card.dataset.currentStatus = status;
    }

    // ─── DONOR TRACKING CARDS ───
    trackingCards.forEach((card) => {
        const cardId = card.dataset.cardId || 'Unknown';
        const cardType = card.dataset.cardType || 'donor';
        const steps = cardType === 'donor' ? donorSteps : recipientSteps;

        // Paint initial state
        paintStages(card, card.dataset.currentStatus || steps[0], steps);

        if (cardType === 'donor') {
            initDonorCard(card, cardId, steps);
        } else {
            initRecipientCard(card, cardId, steps);
        }
    });

    // ─── DONOR CARD: role-based controls ───
    function initDonorCard(card, reference, steps) {
        // 1) Confirm Hair Received button (Verified → Received Hair)
        const confirmReceivedBtn = card.querySelector('[data-confirm-received]');
        if (confirmReceivedBtn) {
            confirmReceivedBtn.addEventListener('click', async () => {
                const proceed = window.confirm(
                    `Confirm that you have physically received the hair for Donation #${reference}?\n\nThis will activate donor points and certificate.`
                );
                if (!proceed) return;

                confirmReceivedBtn.disabled = true;
                confirmReceivedBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';

                try {
                    const res = await fetch(`/staff/tracking/${reference}/update-status`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'Received Hair',
                            notes: 'Staff confirmed receipt of hair from donor'
                        })
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                        paintStages(card, 'received-hair', steps);
                        // Reload to show the wigmaker assignment controls
                        setTimeout(() => location.reload(), 600);
                    } else {
                        alert(data.message || 'Failed to update status');
                        confirmReceivedBtn.disabled = false;
                        confirmReceivedBtn.innerHTML = '<i class="bx bx-package"></i> Confirm Hair Received from Donor';
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error. Please try again.');
                    confirmReceivedBtn.disabled = false;
                    confirmReceivedBtn.innerHTML = '<i class="bx bx-package"></i> Confirm Hair Received from Donor';
                }
            });
        }

        // 2) Assign Wigmaker button (Received Hair → In Queue)
        const assignBtn = card.querySelector('[data-assign-wigmaker]');
        const wigmakerSelect = card.querySelector('[data-wigmaker-assignment]');
        if (assignBtn && wigmakerSelect) {
            assignBtn.addEventListener('click', async () => {
                const wigmakerId = wigmakerSelect.value;
                if (!wigmakerId) {
                    alert('Please select a wigmaker before assigning.');
                    wigmakerSelect.focus();
                    return;
                }

                const selectedName = wigmakerSelect.options[wigmakerSelect.selectedIndex].text;
                const proceed = window.confirm(
                    `Assign Donation #${reference} to ${selectedName}?\n\nThis will move the donation to In Queue and create a production task for the wigmaker.`
                );
                if (!proceed) return;

                assignBtn.disabled = true;
                assignBtn.textContent = 'Assigning...';

                try {
                    const res = await fetch(`/staff/tracking/${reference}/assign-wigmaker`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ wigmaker_id: wigmakerId })
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                        const banner = card.querySelector('[data-edit-banner]');
                        if (banner) {
                            banner.hidden = false;
                            banner.textContent = data.message;
                            banner.classList.add('approved');
                        }
                        paintStages(card, 'in-queue', steps);
                        // Reload to show read-only sync notice
                        setTimeout(() => location.reload(), 800);
                    } else {
                        alert(data.message || 'Failed to assign wigmaker');
                        assignBtn.disabled = false;
                        assignBtn.textContent = 'Assign & Move to Queue';
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error. Please try again.');
                    assignBtn.disabled = false;
                    assignBtn.textContent = 'Assign & Move to Queue';
                }
            });
        }

        // 3) Confirm Wig Received button (Completed → Wig Received)
        const confirmWigBtn = card.querySelector('[data-confirm-wig-received]');
        if (confirmWigBtn) {
            confirmWigBtn.addEventListener('click', async () => {
                const proceed = window.confirm(
                    `Confirm that the completed wig for Donation #${reference} has been delivered to staff?\n\nThis will finalize the workflow with a timestamp.`
                );
                if (!proceed) return;

                confirmWigBtn.disabled = true;
                confirmWigBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';

                try {
                    const res = await fetch(`/staff/tracking/${reference}/update-status`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'Wig Received',
                            notes: 'Staff confirmed receipt of completed wig from wigmaker'
                        })
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                        paintStages(card, 'wig-received', steps);
                        // Reload to show final state
                        setTimeout(() => location.reload(), 600);
                    } else {
                        alert(data.message || 'Failed to update status');
                        confirmWigBtn.disabled = false;
                        confirmWigBtn.innerHTML = '<i class="bx bx-gift"></i> Confirm Wig Received from Wigmaker';
                    }
                } catch (err) {
                    console.error(err);
                    alert('Network error. Please try again.');
                    confirmWigBtn.disabled = false;
                    confirmWigBtn.innerHTML = '<i class="bx bx-gift"></i> Confirm Wig Received from Wigmaker';
                }
            });
        }
    }

    // ─── RECIPIENT CARD: original advance logic ───
    function initRecipientCard(card, reference, steps) {
        const lastUpdated = card.querySelector('[data-last-updated]');

        const stampUpdate = (status) => {
            if (!lastUpdated) return;
            const now = new Date().toLocaleString();
            lastUpdated.textContent = `Last updated: ${now} by Staff (Moved to ${labels[status]}, Request # ${reference})`;
        };

        const updateBackend = async (newStatus, notes) => {
            try {
                const response = await fetch(`/staff/tracking/${reference}/update-status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        status: newStatus,
                        notes: notes
                    })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    paintStages(card, newStatus.toLowerCase().replace(' ', '-'), steps);
                    stampUpdate(newStatus);
                    setTimeout(() => location.reload(), 600);
                    return true;
                } else {
                    alert(data.message || 'Error updating status');
                    return false;
                }
            } catch (error) {
                console.error(error);
                alert('Network error updating status');
                return false;
            }
        };

        const shipBtn = card.querySelector('[data-ship-wig]');
        if (shipBtn) {
            shipBtn.addEventListener('click', async () => {
                const proceed = window.confirm(`Confirm shipment for Request # ${reference}?\n\nThis will move the status to In Transit.`);
                if (!proceed) return;

                shipBtn.disabled = true;
                shipBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
                await updateBackend('In Transit', 'Staff confirmed wig shipment');
            });
        }

        const completeBtn = card.querySelector('[data-complete-delivery]');
        if (completeBtn) {
            completeBtn.addEventListener('click', async () => {
                const proceed = window.confirm(`Confirm delivery for Request # ${reference}?\n\nThis will mark the request as Completed.`);
                if (!proceed) return;

                completeBtn.disabled = true;
                completeBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processing...';
                await updateBackend('Completed', 'Staff confirmed wig delivery to recipient');
            });
        }
    }

    // ─── SEARCH FILTER ───
    const searchBlocks = document.querySelectorAll('[data-search-block]');
    searchBlocks.forEach((block) => {
        const input = block.querySelector('[data-search-input]');
        const rows = block.querySelectorAll('[data-search-row]');
        if (!input || !rows.length) return;

        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();
            rows.forEach((row) => {
                row.hidden = !row.textContent.toLowerCase().includes(query);
            });
        });
    });

    // ─── PRINT ───
    document.querySelectorAll('[data-print-trigger]').forEach((btn) => {
        btn.addEventListener('click', () => window.print());
    });

    // ─── RULE MATCHING (unchanged) ───
    const recipientButtons = document.querySelectorAll('[data-recipient-btn]');
    const recipientName = document.querySelector('[data-recipient-name]');
    const recipientNeed = document.querySelector('[data-recipient-need]');
    const recipientLength = document.querySelector('[data-recipient-length]');
    const recipientColor = document.querySelector('[data-recipient-color]');
    const wigCards = document.querySelectorAll('[data-wig-card]');
    const matchMode = document.querySelector('[data-match-mode]');
    const matchEmpty = document.querySelector('[data-match-empty]');

    let selectedRecipient = null;

    const normalize = (value) => (value || '').trim().toLowerCase();
    const parseStockDate = (value) => {
        const parsed = Date.parse(value || '');
        return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
    };

    const normalizeSize = (val) => {
        const s = normalize(val);
        if (s.includes('10 to 14') || s === 'short') return 'short';
        if (s.includes('15 to 20') || s === 'medium') return 'medium';
        if (s.includes('more than 20') || s === 'long') return 'long';
        return s;
    };

    const sizeDistance = (a, b) => {
        const order = ['short', 'medium', 'long'];
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia < 0 || ib < 0) {
            return 99;
        }
        return Math.abs(ia - ib);
    };

    const isSimilarColor = (a, b) => {
        const left = normalize(a);
        const right = normalize(b);
        if (!left || !right) {
            return false;
        }

        const aliases = {
            'dark brown': 'brown',
            'light brown': 'brown',
            'auburn': 'red',
            'auburn / red': 'red',
            'red': 'red',
            'gray': 'gray',
            'grey': 'gray',
            'white': 'gray',
            'gray / white': 'gray',
            'blonde': 'blonde'
        };

        const l = aliases[left] || left;
        const r = aliases[right] || right;

        if (l === r) {
            return true;
        }

        const similarPairs = [
            ['black', 'brown'],
            ['brown', 'red'],
            ['blonde', 'gray'],
        ];

        return similarPairs.some(([x, y]) => (l === x && r === y) || (l === y && r === x));
    };

    const computeScore = (card, preferredLength, preferredColor) => {
        const wigLength = normalizeSize(card.dataset.length);
        const wantedLength = normalizeSize(preferredLength);
        const wigColor = normalize(card.dataset.color);
        const wantedColor = normalize(preferredColor);
        const available = card.dataset.available === 'true';

        let sizeScore = 0;
        let colorScore = 0;
        let availabilityScore = 0;

        if (wigLength === wantedLength) {
            sizeScore = 40;
        } else if (sizeDistance(wigLength, wantedLength) === 1) {
            sizeScore = 20;
        }

        if (wigColor === wantedColor) {
            colorScore = 40;
        } else if (isSimilarColor(wigColor, wantedColor)) {
            colorScore = 20;
        }

        if (available) {
            availabilityScore = 20;
        }

        const total = sizeScore + colorScore + availabilityScore;
        return {
            total,
            size: sizeScore,
            color: colorScore,
            availability: availabilityScore,
        };
    };

    const renderMatch = (button) => {
        const name = button.dataset.name;
        const length = button.dataset.length;
        const color = button.dataset.color;
        const mode = matchMode ? matchMode.value : 'high';
        const threshold = 85;

        if (recipientName) recipientName.textContent = name;
        if (recipientLength) recipientLength.textContent = length;
        if (recipientColor) recipientColor.textContent = color;

        const ranked = Array.from(wigCards).map((card) => {
            const scoreParts = computeScore(card, length, color);
            const score = scoreParts.total;
            const available = card.dataset.available === 'true';
            const stockDate = parseStockDate(card.dataset.stockDate);

            card.querySelector('[data-score]').textContent = `${score}%`;
            const breakdown = card.querySelector('[data-score-breakdown]');
            if (breakdown) {
                breakdown.textContent = `Size ${scoreParts.size} + Color ${scoreParts.color} + Availability ${scoreParts.availability} = ${scoreParts.total}`;
            }
            card.classList.toggle('unavailable', !available);

            return { card, score, available, stockDate };
        });

        ranked.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.stockDate - b.stockDate;
        });

        ranked.forEach(({ card }, index) => {
            card.style.order = String(index + 1);
        });

        let shown = 0;
        ranked.forEach(({ card, score, available }, index) => {
            let visible = available;
            if (mode === 'high') {
                visible = visible && score >= threshold;
            } else if (mode === 'top3') {
                visible = visible && index < 3;
            }
            card.hidden = !visible;
            if (visible) {
                shown += 1;
            }
        });

        if (matchEmpty) {
            matchEmpty.hidden = shown > 0;
        }
    };

    recipientButtons.forEach((button) => {
        button.addEventListener('click', () => {
            recipientButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            selectedRecipient = button;
            renderMatch(button);
        });
    });

    if (matchMode) {
        matchMode.addEventListener('change', () => {
            if (selectedRecipient) {
                renderMatch(selectedRecipient);
            }
        });
    }

    const activeRecipient = document.querySelector('[data-recipient-btn].active');
    if (activeRecipient) {
        selectedRecipient = activeRecipient;
        renderMatch(activeRecipient);
    }

    // ─── VERIFICATION & MATCHING ───
    const matchButtons = document.querySelectorAll('[data-match-btn]');
    matchButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!selectedRecipient) {
                alert('Please select a recipient first.');
                return;
            }

            const wigId = btn.dataset.wigId;
            const reqRef = selectedRecipient.dataset.reference;
            const reqName = selectedRecipient.dataset.name;

            const proceed = window.confirm(`Confirm matching Request #${reqRef} (${reqName}) with this wig?\n\nThis will notify the recipient and update tracking.`);
            if (!proceed) return;

            btn.disabled = true;
            btn.textContent = 'Matching...';

            try {
                const res = await fetch('/staff/matching/match', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        request_reference: reqRef,
                        wig_id: wigId
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    alert(data.message);
                    window.location.href = '/staff/realtime-tracking';
                } else {
                    alert(data.message || 'Matching failed');
                    btn.disabled = false;
                    btn.textContent = 'Choose this wig';
                }
            } catch (err) {
                console.error(err);
                alert('Network error. Please try again.');
                btn.disabled = false;
                btn.textContent = 'Choose this wig';
            }
        });
    });

    const verificationForm = document.querySelector('[data-verification-form]');
    const decisionButtons = document.querySelectorAll('[data-decision-btn]');
    const decisionBanner = document.querySelector('[data-decision-banner]');
    const remarks = document.getElementById('decisionRemarks');

    decisionButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            if (!verificationForm || !remarks || !decisionBanner) return;

            const text = remarks.value.trim();
            if (!text) {
                remarks.reportValidity();
                return;
            }

            const decision = button.dataset.decision;
            const status = decision === 'approved' ? (verificationForm.dataset.actionUrl.includes('/donor/') ? 'Verified' : 'Validated') : 'Rejected';
            const url = verificationForm.dataset.actionUrl;
            
            button.disabled = true;
            button.innerText = 'Processing...';

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        status: status,
                        remarks: text
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    decisionBanner.hidden = false;
                    decisionBanner.classList.remove('approved', 'rejected');
                    decisionBanner.classList.add(decision);
                    decisionBanner.textContent = decision === 'approved' 
                        ? 'Submission approved. Notification queued and workflow updated.' 
                        : 'Submission rejected. Remarks saved and user notification queued.';
                    
                    setTimeout(() => {
                        window.location.href = verificationForm.dataset.actionUrl.includes('/donor/') 
                            ? '/staff/donor-verification' 
                            : '/staff/recipient-verification';
                    }, 200);
                } else {
                    alert(data.message || 'Error updating status');
                }
            } catch (error) {
                console.error(error);
                alert('A network error occurred.');
            } finally {
                button.disabled = false;
                button.innerText = decision.charAt(0).toUpperCase() + decision.slice(1);
            }
        });
    });
});
