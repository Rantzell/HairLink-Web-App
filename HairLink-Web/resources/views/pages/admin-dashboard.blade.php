@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Dashboard')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    <header class="admin-hero admin-surface">
        <div class="admin-hero-copy">
            <p class="admin-kicker">Administrative Dashboard</p>
            <h1>Admin Overview</h1>
            <p>Monitor donor and recipient workflows, approvals, and operational activity from one clear workspace.</p>
        </div>

        <aside class="admin-hero-side">
            <div class="admin-hero-badge">
                <i class='bx bxs-shield-alt-2'></i>
                <span>Admin View</span>
            </div>

            <div class="admin-hero-summary">
                <div>
                    <strong>Next priority</strong>
                    <span>{{ $pendingVerifications }} records awaiting review</span>
                </div>
                <a class="admin-quick-btn admin-quick-btn-primary" href="{{ route('admin.verification') }}">
                    <i class='bx bx-right-arrow-alt'></i> Open Review Queue
                </a>
            </div>
        </aside>
    </header>

    <section class="admin-stat-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <x-dashboard.stat-card 
            title="Donor Submissions" 
            :value="$donationsCount" 
            subtitle="Total hair donations recorded"
            icon="bx-transfer-alt"
            type="donor"
        />

        <x-dashboard.stat-card 
            title="Registered Users" 
            :value="$usersCount" 
            subtitle="Total users in the system"
            icon="bx-check-circle"
            type="approved"
        />

        <x-dashboard.stat-card 
            title="Recipient Requests" 
            :value="$requestsCount" 
            subtitle="Requests submitted through the portal"
            icon="bx-user-check"
            type="recipient"
        />

        <x-dashboard.stat-card 
            title="Pending Review" 
            :value="$pendingVerifications" 
            subtitle="Requires immediate admin decision"
            icon="bx-time-five"
            type="pending"
        />
    </section>

    <div class="admin-toolbar admin-surface">
        <div class="admin-toolbar-copy">
            <h2>Quick Actions</h2>
            <p>Use the most common admin tasks without leaving the dashboard.</p>
        </div>
        <div class="admin-quick-actions">
            <a class="admin-quick-btn" href="{{ route('admin.verification') }}">
                <i class='bx bx-check-shield'></i> Review Verification
            </a>
            <a class="admin-quick-btn" href="{{ route('admin.matching') }}">
                <i class='bx bx-sort-alt-2'></i> Review Matching
            </a>
            <a class="admin-quick-btn" href="{{ route('admin.inventory') }}">
                <i class='bx bx-cube'></i> Check Inventory
            </a>
            <a class="admin-quick-btn" href="{{ route('admin.operations') }}">
                <i class='bx bx-pulse'></i> View Operations
            </a>
        </div>
    </div>

    <section class="admin-priority-grid">
        <article class="admin-focus-card admin-focus-donor">
            <div class="admin-focus-head">
                <div>
                    <p class="admin-section-kicker">Priority Queue</p>
                    <h2><i class='bx bx-transfer-alt'></i> Donor Submissions</h2>
                </div>
                <a class="admin-review-link" href="{{ route('admin.verification') }}">View all</a>
            </div>

            <div class="admin-focus-summary">
                <div class="admin-mini-stat">
                    <strong>{{ $approvedDonations }}</strong>
                    <span>Approved</span>
                </div>
                <div class="admin-mini-stat">
                    <strong>{{ $pendingDonationsCount }}</strong>
                    <span>Pending</span>
                </div>
                <div class="admin-mini-stat">
                    <strong>{{ $rejectedDonations }}</strong>
                    <span>Rejected</span>
                </div>
            </div>

            <div class="admin-queue-list">
                @forelse($recentDonations as $donation)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $donation->reference }} · {{ $donation->user->first_name ?? '' }} {{ $donation->user->last_name ?? '' }}</strong>
                            <x-dashboard.status-pill :status="$donation->status" />
                        </div>
                        <p>{{ $donation->hair_length }} hair · {{ $donation->hair_color }} · Submitted {{ $donation->created_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('admin.verification') }}">Review</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No donor submissions yet.</p>
                @endforelse
            </div>
        </article>

        <article class="admin-focus-card admin-focus-recipient">
            <div class="admin-focus-head">
                <div>
                    <p class="admin-section-kicker">Priority Queue</p>
                    <h2><i class='bx bx-user-check'></i> Recipient Requests</h2>
                </div>
                <a class="admin-review-link" href="{{ route('admin.matching') }}">View all</a>
            </div>

            <div class="admin-focus-summary">
                <div class="admin-mini-stat">
                    <strong>{{ $approvedRequests }}</strong>
                    <span>Approved</span>
                </div>
                <div class="admin-mini-stat">
                    <strong>{{ $pendingRequestsCount }}</strong>
                    <span>Pending</span>
                </div>
                <div class="admin-mini-stat">
                    <strong>{{ $needsMatchRequests }}</strong>
                    <span>Needs Match</span>
                </div>
            </div>

            <div class="admin-queue-list">
                @forelse($recentRequests as $request)
                <article class="admin-queue-item">
                    <div class="admin-queue-main">
                        <div class="admin-queue-title-row">
                            <strong>{{ $request->reference }} · {{ $request->user->first_name ?? '' }} {{ $request->user->last_name ?? '' }}</strong>
                            <x-dashboard.status-pill :status="$request->status" />
                        </div>
                        <p>Request submitted {{ $request->created_at->format('M d, Y') }}</p>
                    </div>
                    <a class="admin-row-link" href="{{ route('admin.matching') }}">Review</a>
                </article>
                @empty
                <p style="color:#7a687f;padding:0.5rem 0;">No recipient requests yet.</p>
                @endforelse
            </div>
        </article>
    </section>

    <article class="admin-card admin-module-panel">
        <div class="admin-card-head admin-card-head-stack">
            <div>
                <p class="admin-section-kicker">Workspace</p>
                <h2><i class='bx bxs-dashboard'></i> Module Access</h2>
            </div>
            <span>Jump to the area you need</span>
        </div>

        <div class="admin-actions admin-actions-module">
            <a class="admin-action-link admin-action-link-strong" href="{{ route('admin.users') }}">
                <div class="admin-action-icon"><i class='bx bx-group'></i></div>
                <div>
                    <h3>User Management</h3>
                    <p>Manage donors, recipients, staff, and wigmakers.</p>
                </div>
            </a>
            <a class="admin-action-link admin-action-link-strong" href="{{ route('admin.verification') }}">
                <div class="admin-action-icon"><i class='bx bx-check-shield'></i></div>
                <div>
                    <h3>Verification Oversight</h3>
                    <p>Review donor and recipient approval queues in one place.</p>
                </div>
            </a>
            <a class="admin-action-link admin-action-link-strong" href="{{ route('admin.matching') }}">
                <div class="admin-action-icon"><i class='bx bx-sort-alt-2'></i></div>
                <div>
                    <h3>Matching Oversight</h3>
                    <p>Track allocation readiness and final wig matching decisions.</p>
                </div>
            </a>
            <a class="admin-action-link" href="{{ route('admin.operations') }}">
                <div class="admin-action-icon"><i class='bx bx-pulse'></i></div>
                <div>
                    <h3>Operations Overview</h3>
                    <p>Watch staff, wigmaker, delivery, and stock movement at system level.</p>
                </div>
            </a>
            <a class="admin-action-link" href="{{ route('admin.inventory') }}">
                <div class="admin-action-icon"><i class='bx bx-cube'></i></div>
                <div>
                    <h3>Inventory Overview</h3>
                    <p>Review hair stock, wig stock, and delivery records.</p>
                </div>
            </a>
            <a class="admin-action-link" href="{{ route('admin.reports') }}">
                <div class="admin-action-icon"><i class='bx bx-file-blank'></i></div>
                <div>
                    <h3>Reports</h3>
                    <p>Open donation, production, and distribution summaries.</p>
                </div>
            </a>
            <a class="admin-action-link" href="{{ route('admin.events') }}">
                <div class="admin-action-icon"><i class='bx bx-calendar-event'></i></div>
                <div>
                    <h3>Events</h3>
                    <p>Schedule public activities and donation drives.</p>
                </div>
            </a>
            <a class="admin-action-link" href="{{ route('admin.community') }}">
                <div class="admin-action-icon"><i class='bx bxs-megaphone'></i></div>
                <div>
                    <h3>Community Forum</h3>
                    <p>Moderate announcements, posts, and discussions.</p>
                </div>
            </a>
        </div>
    </article>

    <div class="admin-optional" data-optional-section>
        <div class="admin-optional-head" data-optional-toggle>
            <h2><i class='bx bx-donate-heart'></i> Monetary Donations</h2>
            <div class="admin-optional-meta">
                <span class="admin-optional-tag">Optional</span>
                <i class='bx bx-chevron-down' data-optional-chevron></i>
            </div>
        </div>

        <div class="admin-optional-body" data-optional-body hidden>
            <x-dashboard.data-table :headers="['Donor Name', 'Date & Time', 'Email Address', 'Amount Paid']">
                @forelse($monetaryDonations as $md)
                <tr class="hover:bg-[#fdf7fb] transition-colors">
                    <td class="px-6 py-4 font-bold text-gray-800">{{ $md->name }}</td>
                    <td class="px-6 py-4 text-gray-600 text-sm">{{ $md->created_at?->format('M d, Y · h:i A') ?? 'N/A' }}</td>
                    <td class="px-6 py-4 text-gray-600 font-medium">{{ $md->email }}</td>
                    <td class="px-6 py-4 font-black text-[#ad246d]">₱{{ number_format($md->amount, 2) }}</td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-400 italic">No monetary donations recorded yet.</td>
                </tr>
                @endforelse
            </x-dashboard.data-table>
        </div>
    </div>

</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin-module.js') }}" defer></script>
@endpush
