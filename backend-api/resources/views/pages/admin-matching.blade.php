@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Matching Oversight')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">
    <header class="admin-page-head">
        <p class="admin-page-kicker">Admin · Matching Oversight</p>
        <h1>Matching and Allocation Monitoring</h1>
        <p>Review matching readiness, allocation priorities, and release-stage exceptions for recipients.</p>
    </header>

    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Ready to Match</span>
            <strong>{{ $readyToMatch }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Completed Wigs</span>
            <strong>{{ $allocatedWigs }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Available Donations</span>
            <strong>{{ $availableDonations->count() }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Approved Requests</span>
            <strong>{{ $approvedRequests->count() }}</strong>
        </div>
    </div>

    <div class="admin-grid-two">
        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Readiness</p>
                    <h2><i class='bx bx-sort-alt-2'></i> Matching Queue</h2>
                </div>
                <span>Verified recipients waiting for best-fit wigs</span>
            </div>

            <div class="admin-queue-list">
                @forelse($approvedRequests as $request)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $request->reference }} · {{ $request->user->first_name ?? '' }} {{ $request->user->last_name ?? '' }}</strong>
                            <span class="admin-chip approved">Ready</span>
                        </div>
                        <p>Request validated {{ $request->updated_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.rule-matching') }}">Review</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No recipients ready for matching.</p>
                @endforelse
            </div>
        </article>

        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Allocation</p>
                    <h2><i class='bx bx-package'></i> Completed Wigs</h2>
                </div>
                <span>Available for recipient allocation</span>
            </div>

            <div class="admin-queue-list">
                @forelse($completedWigs as $wig)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $wig->task_code }}</strong>
                            <span class="admin-chip available">Available</span>
                        </div>
                        <p>{{ $wig->target_length }} · {{ $wig->target_color }} · Completed {{ $wig->updated_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.recipient-matching-list') }}">Track</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No completed wigs available for allocation.</p>
                @endforelse
            </div>
        </article>
    </div>

    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <div>
                <p class="admin-section-kicker">Overview</p>
                <h2><i class='bx bx-spreadsheet'></i> Matching Pipeline</h2>
            </div>
            <div class="admin-tools">
                <input type="text" placeholder="Search recipient or stock..." data-admin-search-input aria-label="Search matching pipeline">
                <button class="soft-btn" type="button" data-admin-search-btn>Search</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Recipient Ref</th>
                        <th>Recipient</th>
                        <th>Status</th>
                        <th>Date Validated</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($approvedRequests as $request)
                    <tr data-admin-search-row>
                        <td>{{ $request->reference }}</td>
                        <td>{{ $request->user->first_name ?? '' }} {{ $request->user->last_name ?? '' }}</td>
                        <td><span class="admin-chip approved">{{ $request->status }}</span></td>
                        <td>{{ $request->updated_at->format('M d, Y') }}</td>
                    </tr>
                    @empty
                    <tr><td colspan="4" style="text-align:center;color:#7a687f;">No approved requests in the pipeline.</td></tr>
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