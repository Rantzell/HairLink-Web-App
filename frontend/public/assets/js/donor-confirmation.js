document.addEventListener('DOMContentLoaded', async () => {
    const moduleApi = window.hairlinkDonorModule;
    if (!moduleApi) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('ref');
    
    let donation;
    try {
        donation = reference ? await moduleApi.getDonation(reference) : await moduleApi.getLatestDonation();
    } catch (error) {
        console.error('Error fetching donation:', error);
    }

    const refText = document.getElementById('confirmRef');
    const statusText = document.getElementById('confirmStatus');
    const donorText = document.getElementById('confirmDonor');
    const submittedText = document.getElementById('confirmSubmitted');
    const detailsText = document.getElementById('confirmDetails');
    const statusPill = document.getElementById('confirmStatusPill');
    const openDetail = document.getElementById('openTrackingDetail');
    const openCertificate = document.getElementById('openCertificate');

    if (!donation) {
        if (detailsText) {
            detailsText.textContent = 'No donation record found yet. Submit a donation first.';
        }
        return;
    }

    const statusClass = `status-${donation.currentStatus.toLowerCase()}`;

    if (refText) refText.textContent = donation.reference;
    if (statusText) statusText.textContent = donation.currentStatus;
    if (donorText) donorText.textContent = donation.fullName;
    if (submittedText) submittedText.textContent = moduleApi.formatDateTime(donation.submittedAt);
    if (detailsText) {
        const treated = donation.treatedHair ? 'Chemically treated hair: Yes' : 'Chemically treated hair: No';
        const dropOffLocation = donation.dropOff?.location || 'Drop-off location to be confirmed';
        const dropOffTime = donation.dropOff?.appointmentAt
            ? moduleApi.formatDateTime(donation.dropOff.appointmentAt)
            : 'Drop-off schedule to be confirmed';

        detailsText.textContent = `${donation.hairLength}, ${donation.hairColor} | ${treated} | Drop-off: ${dropOffLocation} | Appointment: ${dropOffTime}`;
    }
    if (statusPill) {
        statusPill.textContent = donation.currentStatus;
        statusPill.className = `status-pill ${statusClass}`;
    }

    if (openDetail) {
        openDetail.setAttribute('href', `/donor/tracking/${encodeURIComponent(donation.reference)}`);
    }

    if (openCertificate) {
        openCertificate.setAttribute('href', `/donor/certificate?ref=${encodeURIComponent(donation.reference)}`);
        if (!donation.certificate) {
            openCertificate.style.display = 'none';
        } else {
            openCertificate.style.display = 'inline-flex';
        }
    }

    // Populate Photo Preview
    const photoPreview = document.getElementById('photoPreview');
    if (photoPreview && donation.photoFrontUrl) {
        photoPreview.innerHTML = `<img src="${donation.photoFrontUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
});
