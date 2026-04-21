@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Verification Oversight')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">
    <header class="admin-page-head">
        <p class="admin-page-kicker">Admin · Verification Oversight</p>
        <h1>Donor and Recipient Review Queue</h1>
        <p>Monitor approvals, exceptions, and records that still need final admin validation.</p>
    </header>

    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Donor Pending</span>
            <strong>{{ $pendingDonations->count() }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Recipient Pending</span>
            <strong>{{ $pendingRequests->count() }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Approved Today</span>
            <strong>{{ $approvedTodayCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Flagged Cases</span>
            <strong>{{ $flaggedCount }}</strong>
        </div>
    </div>

    <div class="admin-grid-two">
        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Donor Review</p>
                    <h2><i class='bx bx-transfer-alt'></i> Donor Hair Verification</h2>
                </div>
                <span>Incoming donation records</span>
            </div>

            <div class="admin-queue-list">
                @forelse($pendingDonations as $donation)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $donation->reference }} · {{ $donation->user->first_name ?? '' }} {{ $donation->user->last_name ?? '' }}</strong>
                            @php
                                $chipClass = match($donation->status) {
                                    'Completed' => 'approved',
                                    'Rejected' => 'rejected',
                                    default => 'pending',
                                };
                            @endphp
                            <span class="admin-chip {{ $chipClass }}">{{ $donation->status }}</span>
                        </div>
                        <p>{{ $donation->hair_length }} hair · {{ $donation->hair_color }} · Submitted {{ $donation->created_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.verification.detail', ['type' => 'donor', 'reference' => $donation->reference]) }}">Open</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No pending donor verifications.</p>
                @endforelse
            </div>
        </article>

        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Recipient Review</p>
                    <h2><i class='bx bx-user-check'></i> Recipient Request Verification</h2>
                </div>
                <span>Medical and wig request approvals</span>
            </div>

            <div class="admin-queue-list">
                @forelse($pendingRequests as $request)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $request->reference }} · {{ $request->user->first_name ?? '' }} {{ $request->user->last_name ?? '' }}</strong>
                            @php
                                $chipClass = match($request->status) {
                                    'Validated' => 'approved',
                                    'Rejected' => 'rejected',
                                    default => 'pending',
                                };
                            @endphp
                            <span class="admin-chip {{ $chipClass }}">{{ $request->status }}</span>
                        </div>
                        <p>Request submitted {{ $request->created_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.verification.detail', ['type' => 'recipient', 'reference' => $request->reference]) }}">Open</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No pending recipient verifications.</p>
                @endforelse
            </div>
        </article>
    </div>

    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <div>
                <p class="admin-section-kicker">Audit Trail</p>
                <h2><i class='bx bx-list-ul'></i> Verification Activity Log</h2>
            </div>
            <div class="admin-tools">
                <input type="text" placeholder="Search reference or person..." data-admin-search-input aria-label="Search verification activity">
                <button class="soft-btn" type="button" data-admin-search-btn>Search</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Person</th>
                        <th>Type</th>
                        <th>Latest Action</th>
                        <th>Owner</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($recentActivity as $activity)
                    <tr data-admin-search-row>
                        <td>{{ $activity->reference }}</td>
                        <td>{{ $activity->person }}</td>
                        <td>{{ $activity->type }}</td>
                        <td>{{ $activity->latest_action }}</td>
                        <td>{{ $activity->owner }}</td>
                        <td>
                            @php
                                $statusClass = match($activity->status) {
                                    'Completed', 'Validated' => 'approved',
                                    'Rejected' => 'rejected',
                                    default => 'pending',
                                };
                            @endphp
                            <span class="admin-chip {{ $statusClass }}">{{ $activity->status }}</span>
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="6" style="text-align:center;color:#7a687f;">No recent activity.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin-module.js') }}" defer></script>
@endpush