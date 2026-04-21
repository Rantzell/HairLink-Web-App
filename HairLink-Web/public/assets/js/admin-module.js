/* ============================================================
   Admin Module JS – HairLink
   Handles: table search, print, tab switch, event form,
            user status toggle, confirmation prompts
   ============================================================ */

(function () {
    'use strict';

    /* ---- Utility ------------------------------------------ */
    function q(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

    function getCsrf() {
        const meta = q('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    }

    function showToast(msg, type) {
        const existing = q('[data-admin-toast]');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.setAttribute('data-admin-toast', '');
        toast.textContent = msg;
        toast.style.cssText = [
            'position:fixed', 'bottom:1.2rem', 'right:1.2rem',
            'border-radius:10px', 'padding:0.6rem 1.2rem',
            'font-size:0.85rem', 'font-weight:700', 'z-index:999',
            'box-shadow:0 6px 18px rgba(0,0,0,0.15)',
            'transition:opacity 0.3s',
            type === 'ok'
                ? 'background:#e9f9f0;color:#1a7a47;border:1px solid #a8e5c4'
                : 'background:#fff0f0;color:#b52424;border:1px solid #f5bebe'
        ].join(';');
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; }, 800);
        setTimeout(() => toast.remove(), 1000);
    }

    /* ---- Table search ------------------------------------- */
    qa('[data-admin-search-block]').forEach(function (block) {
        const input = q('[data-admin-search-input]', block);
        if (!input) return;

        function doSearch() {
            const term = input.value.trim().toLowerCase();
            qa('[data-admin-search-row]', block).forEach(function (row) {
                row.style.display = (!term || row.textContent.toLowerCase().includes(term)) ? '' : 'none';
            });
        }

        input.addEventListener('input', doSearch);

        const btn = q('[data-admin-search-btn]', block);
        if (btn) btn.addEventListener('click', doSearch);
    });

    /* ---- Print -------------------------------------------- */
    qa('[data-admin-print]').forEach(function (btn) {
        btn.addEventListener('click', function () { window.print(); });
    });

    /* ---- Tab switching (inventory sections) --------------- */
    qa('[data-inv-tabs]').forEach(function (tabsEl) {
        const tabs    = qa('[data-inv-tab]', tabsEl);
        const panels  = qa('[data-inv-panel]');

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const target = tab.dataset.invTab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                panels.forEach(function (panel) {
                    panel.hidden = panel.dataset.invPanel !== target;
                });
            });
        });
    });

    /* ---- User status toggle ------------------------------- */
    qa('[data-user-toggle]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            const row    = btn.closest('tr');
            const chip   = q('[data-user-chip]', row);
            const name   = q('[data-user-name]', row)?.textContent.trim() ?? 'this user';
            const userId = btn.dataset.userId;
            const isActive = chip?.dataset.userChip === 'active';
            const action = isActive ? 'deactivate' : 'activate';

            if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} account for ${name}?`)) return;

            if (userId) {
                try {
                    const response = await fetch(`/admin/users/${userId}/toggle`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': getCsrf(),
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ action: action })
                    });

                    if (!response.ok) {
                        showToast('Failed to update user status.', 'err');
                        return;
                    }
                } catch (error) {
                    console.error(error);
                    showToast('Network error.', 'err');
                    return;
                }
            }

            if (isActive) {
                chip.textContent = 'Inactive';
                chip.className   = 'admin-chip inactive';
                chip.dataset.userChip = 'inactive';
                btn.textContent  = 'Activate';
            } else {
                chip.textContent = 'Active';
                chip.className   = 'admin-chip active';
                chip.dataset.userChip = 'active';
                btn.textContent  = 'Deactivate';
            }
            showToast(`Account ${action}d.`, 'ok');
        });
    });

    /* ---- Event form save ---------------------------------- */
    const eventForm = q('[data-event-form]');
    if (eventForm) {
        eventForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const title = (q('[name="event_title"]', eventForm)?.value ?? '').trim();
            const date = (q('[name="event_date"]', eventForm)?.value ?? '').trim();
            if (!title) { showToast('Event title is required.', 'err'); return; }
            if (!date) { showToast('Event date is required.', 'err'); return; }

            const url = eventForm.dataset.actionUrl;
            if (!url) {
                showToast('Event saved (demo).', 'ok');
                eventForm.reset();
                return;
            }

            const formData = new FormData(eventForm);
            const data = {
                event_title: formData.get('event_title'),
                event_date: formData.get('event_date'),
                event_description: formData.get('event_description') || '',
                event_location: formData.get('event_location') || '',
            };

            const submitBtn = eventForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrf(),
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(result.message || 'Event created successfully.', 'ok');
                    eventForm.reset();
                    setTimeout(() => window.location.reload(), 200);
                } else {
                    const errors = result.errors ? Object.values(result.errors).flat().join(', ') : (result.message || 'Validation failed.');
                    showToast(errors, 'err');
                }
            } catch (error) {
                console.error(error);
                showToast('Network error saving event.', 'err');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Event';
                }
            }
        });
    }

    /* ---- Optional section toggle (Monetary Donations) ------- */
    qa('[data-optional-toggle]').forEach(function (toggle) {
        const section  = toggle.closest('[data-optional-section]');
        const body     = q('[data-optional-body]', section);
        const chevron  = q('[data-optional-chevron]', toggle);
        if (!body) return;

        toggle.addEventListener('click', function () {
            const isHidden = body.hasAttribute('hidden');
            if (isHidden) {
                body.removeAttribute('hidden');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            } else {
                body.setAttribute('hidden', '');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            }
        });
    });

    /* ---- Report download (demo) --------------------------- */
    qa('[data-report-dl]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            showToast('Download ready (demo).', 'ok');
        });
    });

    /* ---- Verification decision (re-used in admin detail) -- */
    const decisionBtns = qa('[data-admin-decision]');
    if (decisionBtns.length) {
        decisionBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const decision = btn.dataset.adminDecision;
                const label = decision === 'approve' ? 'approve' : 'reject';
                if (!confirm(`Confirm: ${label} this submission?`)) return;
                const banner = q('[data-admin-decision-banner]');
                if (banner) {
                    banner.hidden = false;
                    banner.dataset.adminDecisionBanner = decision;
                    banner.textContent = decision === 'approve'
                        ? 'Submission approved successfully.'
                        : 'Submission has been rejected.';
                }
                decisionBtns.forEach(b => b.disabled = true);
            });
        });
    }

})();
