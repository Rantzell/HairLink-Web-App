document.addEventListener('DOMContentLoaded', function () {
    const requestForm = document.getElementById('request-form');
    const documentsInput = document.getElementById('documents');
    const additionalPhotoInput = document.getElementById('additional-photo');
    const fileList = document.getElementById('file-list');
    const photoDisplay = document.getElementById('photo-display');

    // File size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    // Track selected files
    let selectedDocuments = [];
    let selectedPhoto = null;

    /**
     * Format file size for display
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Validate file
     */
    function validateFile(file, isImage = false) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" exceeds 10MB limit`);
            return false;
        }

        if (isImage) {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid image format`);
                return false;
            }
        } else {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid document format`);
                return false;
            }
        }

        return true;
    }

    /**
     * Handle document upload
     */
    function handleDocumentUpload(e) {
        const files = Array.from(e.target.files);
        selectedDocuments = [];
        fileList.innerHTML = '';

        files.forEach(file => {
            if (validateFile(file)) {
                selectedDocuments.push(file);
                renderDocumentItem(file);
            }
        });
    }

    /**
     * Render document item in list
     */
    function renderDocumentItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" class="file-item-remove">Remove</button>
        `;

        item.querySelector('.file-item-remove').addEventListener('click', () => {
            selectedDocuments = selectedDocuments.filter(f => f.name !== file.name);
            item.remove();
        });

        fileList.appendChild(item);
    }

    /**
     * Handle photo upload
     */
    function handlePhotoUpload(e) {
        const file = e.target.files[0];
        selectedPhoto = null;
        photoDisplay.innerHTML = '';

        if (file && validateFile(file, true)) {
            selectedPhoto = file;
            renderPhotoItem(file);
        }
    }

    /**
     * Render photo item in list
     */
    function renderPhotoItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" class="file-item-remove">Remove</button>
        `;

        item.querySelector('.file-item-remove').addEventListener('click', () => {
            selectedPhoto = null;
            additionalPhotoInput.value = '';
            item.remove();
        });

        photoDisplay.appendChild(item);
    }

    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();

        // Validate files
        if (selectedDocuments.length === 0) {
            alert('Please upload at least one supporting document');
            return;
        }

        if (!selectedPhoto) {
            alert('Please upload a reference photo');
            return;
        }

        const submitBtn = requestForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            // Create request data
            const requestData = {
                fullName: document.getElementById('full-name').value,
                contactNumber: document.getElementById('contact-number').value,
                gender: document.getElementById('gender').value,
                email: document.getElementById('email').value,
                story: document.getElementById('story').value,
                wigLength: document.getElementById('wig-length')?.value || '',
                wigColor: document.getElementById('wig-color')?.value || '',
                fileDocuments: selectedDocuments,
                filePhoto: selectedPhoto
            };

            // Create request and redirect to confirmation
            const newRequest = await window.hairlinkRecipientModule.createRequest(requestData);
            window.location.href = `/recipient/confirmation?ref=${newRequest.reference}`;
        } catch (error) {
            console.error('Request submission error:', error);
            alert('There was an error submitting your request. Please try again.');
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    // Event listeners
    documentsInput.addEventListener('change', handleDocumentUpload);
    additionalPhotoInput.addEventListener('change', handlePhotoUpload);
    requestForm.addEventListener('submit', handleSubmit);
});
