@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Operations Overview')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">
    <header class="admin-page-head">
        <p class="admin-page-kicker">Admin · Operations Overview</p>
        <h1>System Operations Overview</h1>
        <p>Monitor staff verification flow, wigmaker production progress, delivery movement, and stock readiness.</p>
    </header>

    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Staff Active</span>
            <strong>{{ $staffCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Wigmaker Tasks</span>
            <strong>{{ $wigTasksCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>In Progress Tasks</span>
            <strong>{{ $transitCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Completed Wigs</span>
            <strong>{{ $completedCount }}</strong>
        </div>
    </div>

    <div class="admin-grid-two">
        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Staff Workflow</p>
                    <h2><i class='bx bx-briefcase-alt-2'></i> Operations Snapshot</h2>
                </div>
                <span>Verification and release handling</span>
            </div>

            <div class="admin-queue-list">
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>Verification Desk</strong>
                            <span class="admin-chip {{ ($pendingDonationsCount + $pendingRequestsCount) > 0 ? 'pending' : 'approved' }}">{{ ($pendingDonationsCount + $pendingRequestsCount) > 0 ? 'Needs Review' : 'Stable' }}</span>
                        </div>
                        <p>{{ $pendingDonationsCount + $pendingRequestsCount }} queue items still waiting for review.</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('admin.verification') }}">Open</a>
                </article>
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>Pending Donations</strong>
                            <span class="admin-chip {{ $pendingDonationsCount > 0 ? 'pending' : 'approved' }}">{{ $pendingDonationsCount > 0 ? 'Active' : 'Clear' }}</span>
                        </div>
                        <p>{{ $pendingDonationsCount }} donation submissions awaiting verification.</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.donor-verification') }}">Open</a>
                </article>
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>Pending Requests</strong>
                            <span class="admin-chip {{ $pendingRequestsCount > 0 ? 'pending' : 'approved' }}">{{ $pendingRequestsCount > 0 ? 'Active' : 'Clear' }}</span>
                        </div>
                        <p>{{ $pendingRequestsCount }} recipient requests awaiting validation.</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.recipient-verification') }}">Open</a>
                </article>
            </div>
        </article>

        <article class="admin-card">
            <div class="admin-card-head admin-card-head-stack">
                <div>
                    <p class="admin-section-kicker">Wigmaker Network</p>
                    <h2><i class='bx bx-cog'></i> Production Snapshot</h2>
                </div>
                <span>Task progress and completion status</span>
            </div>

            <div class="admin-queue-list">
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>Total Wig Tasks</strong>
                            <span class="admin-chip {{ $wigTasksCount > 0 ? 'pending' : 'approved' }}">{{ $wigTasksCount }} tasks</span>
                        </div>
                        <p>{{ $activeWigTasks }} active tasks across {{ $activeWigmakers }} wigmaker(s).</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('admin.inventory') }}">View</a>
                </article>
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>Completed Wigs</strong>
                            <span class="admin-chip arrived">{{ $completedCount }} ready</span>
                        </div>
                        <p>Wigs completed and available for recipient allocation.</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.wig-stock') }}">View</a>
                </article>
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>In Progress</strong>
                            <span class="admin-chip transit">{{ $transitCount }} active</span>
                        </div>
                        <p>Wig production tasks currently being worked on by wigmakers.</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('staff.realtime-tracking') }}">Track</a>
                </article>
            </div>
        </article>
    </div>

    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <div>
                <p class="admin-section-kicker">System Activity</p>
                <h2><i class='bx bx-table'></i> Operations Monitor</h2>
            </div>
            <div class="admin-tools">
                <input type="text" placeholder="Search team, batch, or module..." data-admin-search-input aria-label="Search operations monitor">
                <button class="soft-btn" type="button" data-admin-search-btn>Search</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Area</th>
                        <th>Owner</th>
                        <th>Current Load</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr data-admin-search-row>
                        <td>Donor Verification</td>
                        <td>Staff Desk</td>
                        <td>{{ $pendingDonationsCount }} pending</td>
                        <td><span class="admin-chip {{ $pendingDonationsCount > 0 ? 'pending' : 'approved' }}">{{ $pendingDonationsCount > 0 ? 'Review Queue' : 'Clear' }}</span></td>
                    </tr>
                    <tr data-admin-search-row>
                        <td>Recipient Verification</td>
                        <td>Staff Desk</td>
                        <td>{{ $pendingRequestsCount }} pending</td>
                        <td><span class="admin-chip {{ $pendingRequestsCount > 0 ? 'pending' : 'approved' }}">{{ $pendingRequestsCount > 0 ? 'Needs Review' : 'Clear' }}</span></td>
                    </tr>
                    <tr data-admin-search-row>
                        <td>Wigmaker Tracking</td>
                        <td>Wigmaker Network</td>
                        <td>{{ $activeWigTasks }} active tasks</td>
                        <td><span class="admin-chip {{ $activeWigTasks > 0 ? 'transit' : 'approved' }}">{{ $activeWigTasks > 0 ? 'Active' : 'Idle' }}</span></td>
                    </tr>
                    <tr data-admin-search-row>
                        <td>Completed Wigs</td>
                        <td>Production</td>
                        <td>{{ $completedCount }} completed</td>
                        <td><span class="admin-chip arrived">Stock Ready</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin-module.js') }}" defer></script>
@endpush