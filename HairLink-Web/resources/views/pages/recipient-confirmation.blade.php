@extends('layouts.dashboard')

@section('title', 'Request Submitted')

@section('content')
<div class="section-wrap" id="confirmationContent">
    <div class="module-head">
        <h1>Request Submitted Successfully!</h1>
        <p>Thank you for trusting us with your journey. We're here to support you every step of the way.</p>
    </div>

    <!-- Success Icon -->
    <div class="success-icon-wrap">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    </div>

    <!-- Submission Summary -->
    <div class="summary-grid">
        <div class="summary-item">
            <span class="summary-label">Reference Number</span>
            <span class="summary-value" id="confirmation-reference">{{ $requestData->reference }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Status</span>
            <span class="summary-value" id="confirmation-status">{{ $requestData->status }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Full Name</span>
            <span class="summary-value" id="confirmation-name">{{ $requestData->user->name ?? 'Recipient' }}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Submitted Date</span>
            <span class="summary-value" id="confirmation-submitted">{{ $requestData->created_at->format('M d, Y') }}</span>
        </div>
    </div>

    <!-- Details Box -->
    <div class="details-box">
        <h3>Request Summary</h3>
        <div class="details-content" id="confirmation-details">
            <div class="detail-item">
                <span class="detail-label">Full Name</span>
                <span class="detail-value">{{ $requestData->user->name ?? 'Recipient' }}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Contact Number</span>
                <span class="detail-value">{{ $requestData->contact_number }}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Gender</span>
                <span class="detail-value">{{ ucfirst($requestData->gender) }}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Your Story</span>
                <span class="detail-value">{{ $requestData->story }}</span>
            </div>
            
            @if(count($requestData->documents_urls) > 0 || $requestData->additional_photo_url)
                <div class="detail-item">
                    <span class="detail-label">Attached Files & Photos</span>
                    <div class="detail-value">
                        <div class="file-preview-grid">
                            @foreach($requestData->documents_urls as $index => $url)
                                @php 
                                    $ext = pathinfo(explode('?', $url)[0], PATHINFO_EXTENSION);
                                    $isImg = in_array(strtolower($ext), ['jpg','jpeg','png','webp','gif','svg']); 
                                @endphp
                                <div class="file-preview-item">
                                    <a href="{{ $url }}" target="_blank" class="file-thumbnail">
                                        @if($isImg)
                                            <img src="{{ $url }}" alt="Doc {{ $index + 1 }}">
                                        @else
                                            <i class='bx bxs-file-pdf'></i>
                                        @endif
                                        <div class="preview-overlay">View Full</div>
                                    </a>
                                    <span class="file-label-small">Document {{ $index + 1 }}</span>
                                </div>
                            @endforeach

                            @if($requestData->additional_photo_url)
                                <div class="file-preview-item">
                                    <a href="{{ $requestData->additional_photo_url }}" target="_blank" class="file-thumbnail">
                                        <img src="{{ $requestData->additional_photo_url }}" alt="Reference Photo">
                                        <div class="preview-overlay">View Full</div>
                                    </a>
                                    <span class="file-label-small">Reference Photo</span>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            @endif

            @if($requestData->appointment_at)
                <div class="detail-item">
                    <span class="detail-label">Appointment Date & Time</span>
                    <span class="detail-value">{{ \Carbon\Carbon::parse($requestData->appointment_at)->format('M d, Y, h:i A') }}</span>
                </div>
            @endif
        </div>
    </div>

    <!-- Next Steps -->
    <div class="next-steps-box">
        <h3>What's Next?</h3>
        <ol class="next-steps-list">
            <li>We will review your request and supporting documents</li>
            <li>Our team will reach out to you directly via your contact number and email</li>
            <li>We'll discuss the details and coordinate your wig matching</li>
            <li>Once your wig is ready, we'll notify you for pickup or delivery</li>
        </ol>
    </div>

    <!-- Action Buttons -->
    <div class="form-actions">
        <a href="{{ route('recipient.tracking') }}" class="soft-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Track Status
        </a>
        <a href="{{ route('recipient.dashboard') }}" class="ghost-btn">Back to Dashboard</a>
    </div>
</div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/recipient-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/recipient-confirmation.js') }}" defer></script>
@endpush
