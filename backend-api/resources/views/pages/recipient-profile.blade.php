@extends('layouts.dashboard')

@section('title', 'HairLink | Recipient Profile')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/profile.css') }}">
@endpush

@section('content')
    <section class="section-wrap profile-shell reveal" data-profile-page data-profile-type="recipient">
        <header class="profile-head">
            <h1>My Profile</h1>
            <p>View your recipient account details and contact information.</p>
        </header>

    @php
        $user = auth()->user();
        $initials = strtoupper(substr($user->first_name ?? $user->name, 0, 1) . substr($user->last_name ?? '', 0, 1));
        $fullName = $user->first_name ? "{$user->first_name} {$user->last_name}" : $user->name;
    @endphp

        <article class="profile-card">
            <div class="profile-hero">
                <div class="profile-avatar" id="profileInitials">{{ $initials }}</div>
                <div>
                    <p class="profile-name" id="profileName">{{ $fullName }}</p>
                    <span class="profile-role status-recipient" id="profileRole">{{ ucfirst($user->role ?? 'Recipient') }}</span>
                </div>
            </div>

            <div class="profile-grid">
                <div class="profile-item">
                    <small>Email</small>
                    <strong id="profileEmail">{{ $user->email }}</strong>
                </div>
                <div class="profile-item">
                    <small>Phone Number</small>
                    <strong id="profilePhone">{{ $user->phone ?? 'Not set' }}</strong>
                </div>
                <div class="profile-item">
                    <small>Age</small>
                    <strong id="profileAge">{{ $user->age ?? 'Not set' }}</strong>
                </div>
                <div class="profile-item">
                    <small>Gender</small>
                    <strong id="profileGender">{{ ucfirst($user->gender ?? 'Not set') }}</strong>
                </div>
                <div class="profile-item">
                    <small>Country</small>
                    <strong id="profileCountry">{{ strtoupper($user->country ?? 'Not set') }}</strong>
                </div>
                <div class="profile-item">
                    <small>Region / Province</small>
                    <strong id="profileRegion">{{ $user->region ?? 'Not set' }}</strong>
                </div>
                <div class="profile-item">
                    <small>Postal Code</small>
                    <strong id="profilePostalCode">{{ $user->postal_code ?? 'Not set' }}</strong>
                </div>
            </div>

            <div class="profile-actions">
                <a class="soft-btn" href="{{ route('recipient.dashboard') }}">Back to Dashboard</a>
                <a class="ghost-btn" href="{{ route('recipient.tracking') }}">Open Tracking</a>
            </div>
        </article>

        <article class="referral-code-card">
            <div class="referral-code-head">
                <i class='bx bxs-gift'></i>
                <div>
                    <h3>Your Referral Code</h3>
                    <p>Share this code with friends to earn star points!</p>
                </div>
            </div>
            <div class="referral-code-display">
                <span id="myReferralCode">HL-{{ strtoupper(substr(md5('hairlink-referral-' . $user->id), 0, 8)) }}</span>
                <button class="copy-code-btn" id="copyCodeBtn" type="button" title="Copy to clipboard">
                    <i class='bx bx-copy'></i> Copy
                </button>
            </div>
        </article>

        <article class="profile-stats">
            <div class="profile-stat">
                <small>Account Type</small>
                <strong>{{ ucfirst($user->role ?? 'Recipient') }}</strong>
            </div>
            <div class="profile-stat">
                <small>Member Since</small>
                <strong id="profileJoined">{{ $user->created_at ? $user->created_at->format('M d, Y') : '-' }}</strong>
            </div>
            <div class="profile-stat">
                <small>Quick Tip</small>
                <strong id="profileRouteHint">Use your dashboard to submit and monitor hair requests.</strong>
            </div>
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/profile.js') }}" defer></script>
@endpush
