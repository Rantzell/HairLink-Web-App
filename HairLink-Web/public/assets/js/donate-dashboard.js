document.addEventListener('DOMContentLoaded', () => {
    const moduleApi = window.hairlinkDonorModule;
    const form = document.getElementById('donationForm');
    const hairPhoto = document.getElementById('hairPhoto');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileName = document.getElementById('fileName');

    if (!form || !hairPhoto || !uploadBtn || !fileName) return;

    uploadBtn.addEventListener('click', () => hairPhoto.click());

    hairPhoto.addEventListener('change', () => {
        const file = hairPhoto.files?.[0];
        if (!file) {
            fileName.textContent = 'No file selected';
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            alert('File is too large. Please upload an image up to 10MB.');
            hairPhoto.value = '';
            fileName.textContent = 'No file selected';
            return;
        }

        fileName.textContent = file.name;
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            const invalidFields = [...form.querySelectorAll(':invalid')];
            invalidFields[0]?.focus();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const photoFile = hairPhoto.files?.[0];

            const payload = {
                fullName: (document.getElementById('fullName')?.value || '').trim(),
                email: (document.getElementById('email')?.value || '').trim(),
                phone: (document.getElementById('phone')?.value || '').trim(),
                hairLength: (document.getElementById('hairLength')?.value || '').trim(),
                hairColor: (document.getElementById('hairColor')?.value || '').trim(),
                treatedHair: Boolean(document.getElementById('treatedHair')?.checked),
                address: (document.getElementById('address')?.value || '').trim(),
                reason: (document.getElementById('reason')?.value || '').trim(),
                photoFront: photoFile
            };

            const donation = await moduleApi.createDonation(payload);

            form.reset();
            if (fileName) fileName.textContent = 'No file selected';
            window.location.href = `/donor/confirmation?ref=${encodeURIComponent(donation.reference)}`;
        } catch (error) {
            console.error('Donation error:', error);
            alert('There was an error submitting your donation. Please try again.');
            if (submitBtn) submitBtn.disabled = false;
        }
    });
});
