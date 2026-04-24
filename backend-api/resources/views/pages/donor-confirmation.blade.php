@extends('layouts.dashboard')

@section('title', 'HairLink | Donation Confirmation')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/donor-module.css') }}">
@endpush

@section('content')
    <section class="section-wrap donor-module-page reveal" id="confirmationContent">
        <header class="module-head">
            <h1>Donation Submitted Successfully</h1>
            <p>Your hair donation is now recorded. Keep your reference number for tracking updates.</p>
        </header>

        <article class="module-card">
            <div class="confirmation-layout" style="display: grid; grid-template-columns: 1fr 300px; gap: 2rem; align-items: start;">
                <div class="summary-info">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <small>Donation Reference</small>
                            <strong id="confirmRef">{{ $donation->reference }}</strong>
                        </div>
                        <div class="summary-item">
                            <small>Current Status</small>
                            <strong id="confirmStatus">{{ $donation->status }}</strong>
                            <div class="demo-row">
                                <span id="confirmStatusPill" class="status-pill status-{{ strtolower(str_replace(' ', '-', $donation->status)) }}">{{ $donation->status }}</span>
                            </div>
                        </div>
                        <div class="summary-item">
                            <small>Donor Name</small>
                            <strong id="confirmDonor">{{ $donation->user->first_name }} {{ $donation->user->last_name }}</strong>
                        </div>
                        <div class="summary-item">
                            <small>Submitted On</small>
                            <strong id="confirmSubmitted">{{ $donation->created_at->format('M d, Y, h:i A') }}</strong>
                        </div>
                    </div>

                    <div class="note-box" id="confirmDetails" style="margin-top: 1.5rem;">
                        {{ $donation->hair_length }}, {{ $donation->hair_color }} | 
                        Chemically treated hair: {{ $donation->treated_hair ? 'Yes' : 'No' }} | 
                        Drop-off: {{ $donation->dropoff_location }} | 
                        Appointment: {{ $donation->appointment_at ? \Carbon\Carbon::parse($donation->appointment_at)->format('M d, Y, h:i A') : 'TBD' }}
                    </div>
                </div>

                <div class="photo-preview-box" style="background: #fdf2f7; border: 1px dashed #ad246d; border-radius: 16px; padding: 1rem; text-align: center;">
                    <small style="display: block; margin-bottom: 0.5rem; color: #ad246d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Donation Photo</small>
                    <div id="photoPreview" style="aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #fff5fa; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(173, 36, 109, 0.05);">
                        @if($donation->photo_front)
                            <a href="{{ $donation->photo_front_url }}" target="_blank" class="file-thumbnail">
                                <img src="{{ $donation->photo_front_url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                <div class="preview-overlay">View Full</div>
                            </a>
                        @else
                            <i class='bx bx-image' style="font-size: 3rem; color: #ead7e8;"></i>
                        @endif
                    </div>
                </div>
            </div>

            <div class="action-row">
                <a class="soft-btn" href="{{ route('donor.tracking.detail', $donation->reference) }}">Open Tracking Detail</a>
                <a class="ghost-btn" href="{{ route('donor.tracking') }}">View All My Donations</a>
                <a class="soft-btn" href="{{ route('donor.certificate', ['ref' => $donation->reference]) }}">Open Donor Certificate</a>
            </div>
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/donor-module.js') }}" defer></script>
@endpush
