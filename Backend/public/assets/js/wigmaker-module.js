document.addEventListener('DOMContentLoaded', () => {
    const trackingCards = document.querySelectorAll('[data-track-card]');
    const donorSteps = ['received', 'in-queue', 'in-progress', 'completed', 'wig-received'];
    
    const labels = {
        'received': 'Received Hair',
        'in-queue': 'In Queue',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'wig-received': 'Wig Received'
    };

    trackingCards.forEach((card) => {
        const cardId = card.dataset.cardId || 'Unknown';
        const steps = donorSteps;
        
        const actionBtn = card.querySelector('[data-move-next]');
        const statusChip = card.querySelector('[data-status-chip]');
        const stageItems = card.querySelectorAll('[data-stage]');
        const issueToggle = card.querySelector('[data-issue-toggle]');
        const issueWrap = card.querySelector('[data-issue-wrap]');
        const issueNote = card.querySelector('[data-issue-note]');
        const saveEdit = card.querySelector('[data-save-edit]');
        const editBanner = card.querySelector('[data-edit-banner]');
        const lastUpdated = card.querySelector('[data-last-updated]');

        const stampUpdate = (reason) => {
            if (!lastUpdated) return;
            const now = new Date().toLocaleString();
            lastUpdated.textContent = `Last updated: ${now} by Wigmaker (${reason}, Task # ${cardId})`;
        };

        const paint = (status) => {
            const activeIndex = steps.indexOf(status);
            const hasIssue = card.dataset.issue === 'true';
            
            if (statusChip) {
                const label = labels[status] || status;
                statusChip.textContent = hasIssue ? `${label} • Issue` : label;
                statusChip.classList.toggle('issue-chip', hasIssue);
            }
            
            stageItems.forEach((item, index) => {
                item.classList.remove('done', 'active');
                if (index < activeIndex) item.classList.add('done');
                if (index === activeIndex) item.classList.add('active');
            });

            if (actionBtn) {
                const isLastStep = activeIndex >= steps.indexOf('completed');
                if (isLastStep || hasIssue) {
                    actionBtn.hidden = true;
                } else {
                    const next = steps[activeIndex + 1];
                    actionBtn.hidden = false;
                    actionBtn.textContent = `Move to ${labels[next]} >`;
                }
            }
            card.dataset.currentStatus = status;
        };

        const updateBackend = async (newStatus, reason) => {
            // Map the unified UI status back to the WigProduction model statuses
            let backendStatus = newStatus;
            if (newStatus === 'in-queue') backendStatus = 'assigned';
            if (newStatus === 'in-progress') backendStatus = 'processing';
            
            const url = `/wigmaker/tasks/${cardId}/update`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        status: backendStatus,
                        notes: reason
                    })
                });

                if (response.ok) {
                    paint(newStatus);
                    stampUpdate(reason);
                    return true;
                } else {
                    const data = await response.json();
                    alert(data.message || 'Error updating task status');
                    return false;
                }
            } catch (error) {
                console.error(error);
                alert('Network error updating task');
                return false;
            }
        };

        // Initialize UI
        paint(card.dataset.currentStatus);

        if (actionBtn) {
            actionBtn.addEventListener('click', async () => {
                const currentStatus = card.dataset.currentStatus;
                const currentIndex = steps.indexOf(currentStatus);
                if (currentIndex < steps.length - 1) {
                    const nextStatus = steps[currentIndex + 1];
                    actionBtn.disabled = true;
                    await updateBackend(nextStatus, `Advanced to ${labels[nextStatus]}`);
                    actionBtn.disabled = false;
                }
            });
        }

        if (issueToggle) {
            issueToggle.addEventListener('change', () => {
                if (issueWrap) {
                    issueWrap.hidden = !issueToggle.checked;
                }
            });
        }

        if (saveEdit) {
            saveEdit.addEventListener('click', async () => {
                const currentStatus = card.dataset.currentStatus;
                const flaggedIssue = issueToggle ? issueToggle.checked : false;

                if (flaggedIssue && issueNote && !issueNote.value.trim()) {
                    issueNote.reportValidity();
                    return;
                }

                const msg = flaggedIssue ? 'Flagging production issue...' : 'Updating info...';
                const proceed = window.confirm(`Update task # ${cardId}?`);
                if (!proceed) return;

                saveEdit.disabled = true;
                const success = await updateBackend(currentStatus, flaggedIssue ? `ISSUE: ${issueNote.value}` : 'Info updated');
                saveEdit.disabled = false;

                if (success) {
                    card.dataset.issue = flaggedIssue ? 'true' : 'false';
                    paint(currentStatus); // Refresh chip
                    if (editBanner) {
                        editBanner.hidden = false;
                        editBanner.textContent = flaggedIssue ? 'Issue flagged.' : 'Saved successfully.';
                        setTimeout(() => { editBanner.hidden = true; }, 3000);
                    }
                }
            });
        }
    });

    // Task Detail Form Handler
    const taskUpdateForm = document.getElementById('taskUpdateForm');
    if (taskUpdateForm) {
        taskUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = taskUpdateForm.querySelector('button[type="submit"]');
            const banner = document.querySelector('[data-update-banner]');
            const historyTable = document.querySelector('.task-table tbody');
            const timelineItems = document.querySelectorAll('.timeline-list li');
            const actionUrl = taskUpdateForm.dataset.actionUrl;

            // Form validation
            if (!taskUpdateForm.checkValidity()) {
                taskUpdateForm.reportValidity();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const formData = new FormData(taskUpdateForm);

            try {
                const response = await fetch(actionUrl, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'Accept': 'application/json'
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    if (banner) {
                        banner.hidden = false;
                        banner.textContent = data.message;
                        banner.className = 'update-banner success-banner';
                        setTimeout(() => { banner.hidden = true; }, 5000);
                    }

                    // 1. Update timeline
                    const savedStatus = formData.get('status');
                    const statusOrder = ['assigned', 'processing', 'completed'];
                    const activeIndex = statusOrder.indexOf(savedStatus);

                    timelineItems.forEach((li, idx) => {
                        li.classList.remove('active', 'done');
                        if (idx < activeIndex) li.classList.add('done');
                        if (idx === activeIndex) li.classList.add('active');
                    });

                    // 2. Update the "Next Stage" fields for sequential flow
                    if (savedStatus === 'completed') {
                        // If we just saved 'completed', we are done!
                        // Hide fields and show completion banner
                        taskUpdateForm.innerHTML = `
                            <div class="completion-banner" style="background: #f0fdf4; color: #166534; padding: 1.5rem; border-radius: 12px; border: 1px solid #bbf7d0; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                                <i class='bx bxs-check-circle' style="font-size: 2rem;"></i>
                                <div>
                                    <strong>Production Completed</strong>
                                    <p style="margin: 0; font-size: 0.9rem;">This task has been finalized and synced with the inventory system.</p>
                                </div>
                            </div>
                            <div class="form-actions">
                                <a class="soft-btn" href="/wigmaker/dashboard">Back to Dashboard</a>
                            </div>
                        `;
                    } else {
                        // Advance to the next stage in the sequence
                        const nextStatusMap = {
                            'assigned': 'processing',
                            'processing': 'completed'
                        };
                        const nextStatus = nextStatusMap[savedStatus] || 'completed';
                        const nextLabel = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
                        
                        const displayInput = document.getElementById('task-status-display');
                        const hiddenInput = taskUpdateForm.querySelector('input[name="status"]');
                        
                        if (displayInput) displayInput.value = nextLabel;
                        if (hiddenInput) hiddenInput.value = nextStatus;
                    }

                    // 3. Add to history table
                    if (historyTable && data.history) {
                        const newRow = document.createElement('tr');
                        const statusLabel = savedStatus === 'processing' ? 'In Progress' : (savedStatus.charAt(0).toUpperCase() + savedStatus.slice(1));
                        const statusClass = savedStatus === 'processing' ? 'in-progress' : savedStatus;
                        
                        let photoHtml = '<span style="color: #ccc;">---</span>';
                        if (data.history.preview_photo_url) {
                            photoHtml = `
                                <a href="${data.history.preview_photo_url}" target="_blank" class="file-thumbnail">
                                    <img src="${data.history.preview_photo_url}" alt="Preview">
                                    <div class="preview-overlay"><i class='bx bx-search'></i></div>
                                </a>
                            `;
                        }

                        newRow.innerHTML = `
                            <td style="vertical-align: middle;">${data.history.at}</td>
                            <td style="text-align: center; vertical-align: middle;">${photoHtml}</td>
                            <td style="vertical-align: middle;"><span class="status-pill status-${statusClass}">${statusLabel}</span></td>
                            <td style="vertical-align: middle;">${data.history.notes}</td>
                        `;
                        // Remove empty state if any
                        const emptyRows = historyTable.querySelectorAll('td[colspan]');
                        emptyRows.forEach(td => td.parentElement.remove());
                        
                        historyTable.insertBefore(newRow, historyTable.firstChild);
                    }

                    // Reset notes and photo
                    const notesField = document.getElementById('progress-notes');
                    const photoField = document.getElementById('preview-photo');
                    if (notesField) notesField.value = '';
                    if (photoField) {
                        photoField.value = '';
                        // Trigger change event to reset preview
                        photoField.dispatchEvent(new Event('change'));
                    }

                } else {
                    alert(data.message || 'Failed to update task');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while saving the update.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Update';
            }
        });
    }

    // Photo Preview Handler
    const previewPhotoInput = document.getElementById('preview-photo');
    if (previewPhotoInput) {
        previewPhotoInput.addEventListener('change', function() {
            const file = this.files[0];
            const container = this.parentElement;
            const icon = container.querySelector('.bx-image-add');
            const label = container.querySelector('span');
            
            // Remove existing preview if any
            let existingPreview = container.querySelector('.file-preview-img');
            if (existingPreview) existingPreview.remove();

            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('file-preview-img');
                    img.style.cssText = 'max-width: 100%; max-height: 200px; border-radius: 12px; margin-bottom: 0.8rem; object-fit: contain; background: #fff; border: 1px solid #ead7e8;';
                    
                    // Hide icon and update text
                    if (icon) icon.style.display = 'none';
                    if (label) {
                        label.textContent = `File selected: ${file.name}`;
                        label.style.color = '#ad246d';
                        label.style.fontWeight = '700';
                    }
                    
                    // Insert before the input
                    container.insertBefore(img, previewPhotoInput);
                    container.style.borderColor = '#ad246d';
                    container.style.background = '#fdf7fb';
                };
                reader.readAsDataURL(file);
            } else {
                // Reset to default state
                if (icon) icon.style.display = 'block';
                if (label) {
                    label.textContent = 'Click to upload or drag and drop';
                    label.style.color = '#7f6b88';
                    label.style.fontWeight = '400';
                }
                container.style.borderColor = '#ead7e8';
                container.style.background = '#fafafa';
            }
        });
    }

    // Simple search filter
    const searchInput = document.querySelector('[data-search-input]');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            const searchRows = document.querySelectorAll('[data-task-row]');
            
            if (searchRows.length > 0) {
                searchRows.forEach(row => {
                    const match = row.textContent.toLowerCase().includes(query);
                    row.style.display = match ? '' : 'none';
                });
            } else {
                trackingCards.forEach(card => {
                    card.hidden = !card.textContent.toLowerCase().includes(query);
                });
            }
        });
    }

    // DASHBOARD TASK FILTERS
    const filterButtons = document.querySelectorAll('.filter-btn');
    const taskRows = document.querySelectorAll('[data-task-row]');

    if (filterButtons.length > 0 && taskRows.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.dataset.filter;
                
                // Update active button state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter rows
                taskRows.forEach(row => {
                    const status = row.dataset.taskStatus; // 'assigned', 'processing', 'completed'
                    
                    if (filterValue === 'all') {
                        row.style.display = '';
                    } else if (filterValue === 'queued' && status === 'assigned') {
                        row.style.display = '';
                    } else if (filterValue === 'in-progress' && status === 'processing') {
                        row.style.display = '';
                    } else if (filterValue === 'completed' && status === 'completed') {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        });
    }
});
