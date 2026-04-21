(function(window) {
    'use strict';

    const STATUS_FLOW = [
        'Submitted',
        'Validated',
        'In Production',
        'Matched',
        'In Transit',
        'Arrived',
        'Completed'
    ];

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
            // Fetch will set correct Content-Type with boundary automatically 
        } else if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API Error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Map backend snake_case model to frontend camelCase expectations
     */
    function mapRequest(data) {
        if (!data) return null;
        return {
            ...data,
            id: data.reference,
            contactNumber: data.contact_number,
            gender: data.gender,
            story: data.story,
            additionalPhoto: data.additional_photo,
            documents: data.documents || [],
            createdAt: data.created_at,
            appointmentAt: data.appointment_at,
            wigLength: data.wig_length,
            wigColor: data.wig_color,
            statusHistory: (data.status_histories || []).map(sh => ({
                status: sh.status,
                timestamp: sh.created_at
            })),
            medicalCertificateUrl: data.medical_certificate_url,
            diagnosisPhotoUrl: data.diagnosis_photo_url,
            recipientPhotoUrl: data.recipient_photo_url,
            additionalPhotoUrl: data.additional_photo_url,
            documentsUrls: data.documents_urls || []
        };
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    function formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    }

    const recipientModule = {
        STATUS_FLOW,
        formatDate,
        formatDateTime,

        async getRequests() {
            const data = await apiCall('/internal-api/requests');
            return data.map(mapRequest);
        },

        async getRequest(reference) {
            const data = await apiCall(`/internal-api/requests/${reference}`);
            return mapRequest(data);
        },

        async createRequest(payload) {
            const formData = new FormData();
            formData.append('reference', `REQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}-${Date.now().toString().slice(-6)}`);
            formData.append('contact_number', payload.contactNumber);
            formData.append('gender', payload.gender);
            formData.append('story', payload.story);
            
            if (payload.wigLength) {
                formData.append('wig_length', payload.wigLength);
            }
            if (payload.wigColor) {
                formData.append('wig_color', payload.wigColor);
            }

            if (payload.appointmentAt) {
                formData.append('appointment_at', payload.appointmentAt);
            } else {
                formData.append('appointment_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
            }

            if (payload.medicalCertificate) {
                formData.append('medical_certificate', payload.medicalCertificate);
            }
            if (payload.diagnosisPhoto) {
                formData.append('diagnosis_photo', payload.diagnosisPhoto);
            }
            if (payload.recipientPhoto) {
                formData.append('recipient_photo', payload.recipientPhoto);
            }

            if (payload.filePhoto) {
                formData.append('additional_photo', payload.filePhoto);
            }

            if (payload.fileDocuments && payload.fileDocuments.length > 0) {
                payload.fileDocuments.forEach(file => {
                    formData.append('documents[]', file);
                });
            }

            const data = await apiCall('/internal-api/requests', 'POST', formData);
            return mapRequest(data);
        },

        async updateRequestStatus(reference, status) {
            if (!STATUS_FLOW.includes(status)) return null;
            const data = await apiCall(`/internal-api/requests/${reference}/status`, 'POST', { status });
            return mapRequest(data);
        },

        async nextStatus(reference) {
            const request = await this.getRequest(reference);
            if (!request) return null;

            const currentIndex = STATUS_FLOW.indexOf(request.status);
            if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
                return await this.updateRequestStatus(reference, STATUS_FLOW[currentIndex + 1]);
            }
            return request;
        }
    };

    window.hairlinkRecipientModule = recipientModule;

})(window);
