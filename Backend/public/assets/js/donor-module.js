(function(window) {
    'use strict';

    const STATUS_FLOW = ['Submitted', 'Verified', 'Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'];

    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    }

    async function apiCall(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            }
        };

        if (body instanceof FormData) {
            options.body = body;
            // Fetch will set the correct Content-Type with boundary automatically
        } else if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Map backend snake_case model to frontend camelCase expectations
     */
    function mapDonation(data) {
        if (!data) return null;
        return {
            ...data,
            fullName: data.user?.name || 'Donor',
            hairLength: data.hair_length,
            hairColor: data.hair_color,
            treatedHair: data.treated_hair,
            submittedAt: data.created_at,
            currentStatus: data.status,
            statusHistory: (data.status_histories || []).map(sh => ({
                status: sh.status,
                at: sh.created_at
            })),
            certificate: data.certificate_no ? {
                certificateNo: data.certificate_no,
                issuedAt: data.updated_at
            } : null,
            dropOff: {
                location: data.dropoff_location,
                appointmentAt: data.appointment_at
            },
            photoFrontUrl: data.photo_front_url,
            photoSideUrl: data.photo_side_url
        };
    }

    function formatDateTime(value) {
        if (!value) return '';
        const date = new Date(value);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    }

    const donorModule = {
        statusFlow: STATUS_FLOW,
        formatDateTime,

        async getAllDonations() {
            const data = await apiCall('/internal-api/donations');
            return data.map(mapDonation);
        },

        async getDonation(reference) {
            const data = await apiCall(`/internal-api/donations/${reference}`);
            return mapDonation(data);
        },

        async createDonation(payload) {
            const formData = new FormData();
            formData.append('reference', payload.reference || `HD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`);
            formData.append('hair_length', payload.hairLength);
            formData.append('hair_color', payload.hairColor);
            formData.append('treated_hair', payload.treatedHair ? '1' : '0');
            formData.append('address', payload.address || '');
            formData.append('reason', payload.reason || '');
            formData.append('dropoff_location', 'Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila');
            
            const apptAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
            formData.append('appointment_at', apptAt);

            if (payload.photoFront) {
                formData.append('photo_front', payload.photoFront);
            }
            if (payload.photoSide) {
                formData.append('photo_side', payload.photoSide);
            }

            const data = await apiCall('/internal-api/donations', 'POST', formData);
            return mapDonation(data);
        },

        async getLatestDonation() {
            const donations = await this.getAllDonations();
            return donations[0] || null;
        },

        async setStatus(reference, status) {
            if (!STATUS_FLOW.includes(status)) return null;
            const data = await apiCall(`/internal-api/donations/${reference}/status`, 'POST', { status });
            return mapDonation(data);
        },

        async nextStatus(reference) {
            const donation = await this.getDonation(reference);
            if (!donation) return null;

            const currentIndex = STATUS_FLOW.indexOf(donation.currentStatus);
            if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
                return await this.setStatus(reference, STATUS_FLOW[currentIndex + 1]);
            }
            return donation;
        }
    };

    window.hairlinkDonorModule = donorModule;

})(window);
