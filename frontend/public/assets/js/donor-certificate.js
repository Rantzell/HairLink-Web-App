document.addEventListener('DOMContentLoaded', async () => {
    const moduleApi = window.hairlinkDonorModule;
    if (!moduleApi) {
        console.error('Donor module not loaded');
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    const certName      = document.getElementById('certName');
    const certReference = document.getElementById('certReference');
    const certNumber    = document.getElementById('certNumber');
    const certIssued    = document.getElementById('certIssued');
    const certStatus    = document.getElementById('certStatus');
    const statusNote    = document.getElementById('certificateStatusNote');
    const printBtn      = document.getElementById('printCertificateBtn');

    let donation;
    try {
        donation = ref
            ? await moduleApi.getDonation(ref)
            : await moduleApi.getLatestDonation();
    } catch (error) {
        console.error('Error fetching donation:', error);
    }

    if (!donation) {
        if (statusNote) {
            statusNote.textContent = 'No donation record found. Submit a donation first.';
        }
        if (printBtn) printBtn.style.display = 'none';
        return;
    }

    // Use donor's real name from user relation, fallback to 'Donor'
    const donorName = donation.fullName && donation.fullName !== 'Donor'
        ? donation.fullName
        : (donation.user?.name || 'Donor');

    if (certName)      certName.textContent = donorName;
    if (certReference) certReference.textContent = donation.reference;
    if (certStatus)    certStatus.textContent = donation.currentStatus;

    if (donation.certificate) {
        if (certNumber) certNumber.textContent = donation.certificate.certificateNo;
        if (certIssued) certIssued.textContent = moduleApi.formatDateTime(donation.certificate.issuedAt);
        if (statusNote) {
            statusNote.textContent = 'Certificate is ready. Click "Print / Save as PDF" to download.';
        }
        // Show print button prominently
        if (printBtn) {
            printBtn.style.display = 'inline-flex';
            printBtn.removeAttribute('disabled');
        }
    } else {
        if (certNumber) certNumber.textContent = 'Pending';
        if (certIssued) certIssued.textContent = 'Pending completion';
        if (statusNote) {
            statusNote.textContent = `Certificate is unavailable until donation status is "Completed". Current status: ${donation.currentStatus}.`;
        }
        // Disable print button but keep it visible
        if (printBtn) {
            printBtn.disabled = true;
            printBtn.title = 'Complete the donation process first';
        }
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (!donation.certificate) {
                alert('Certificate is not yet available. Please wait until the donation is Completed.');
                return;
            }
            // Trigger print dialog (browser will show Save as PDF option)
            window.print();
        });
    }
});
