@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Reports')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    <header style="padding:0.6rem 0 0.2rem">
        <p style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9b2f69;margin-bottom:0.2rem;">Admin · Reports</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.5rem,3vw,2.1rem);color:#261d2b;">Reports</h1>
        <p style="color:#665772;font-size:0.88rem;margin-top:0.25rem;">System-wide summary data and downloadable reports.</p>
    </header>

    {{-- KPI overview --}}
    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Monetary Total</span>
            <strong>₱{{ number_format($monetaryTotal, 0) }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Hair Received</span>
            <strong>{{ $donationsCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Wigs Produced</span>
            <strong>{{ $wigsDistributed }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Recipients Served</span>
            <strong>{{ $recipientsServed }}</strong>
        </div>
    </div>

    {{-- Report cards --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-file-blank'></i> Downloadable Reports</h2>
            <span>Click to simulate download</span>
        </div>

        <div class="report-grid">
            <div class="report-card">
                <h3><i class='bx bx-donate-heart'></i> Monetary Donations</h3>
                <p>Summary of all monetary donations by period, donor, and amount.</p>
                <span class="report-stat">₱{{ number_format($monetaryTotal, 0) }}</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download CSV
                </button>
            </div>
            <div class="report-card">
                <h3><i class='bx bx-transfer-alt'></i> Hair Donation Report</h3>
                <p>All hair submissions with length, color, and approval status breakdown.</p>
                <span class="report-stat">{{ $donationsCount }} records</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download CSV
                </button>
            </div>
            <div class="report-card">
                <h3><i class='bx bx-package'></i> Wig Production Report</h3>
                <p>Batch-level production progress and wig completion rates by wigmaker.</p>
                <span class="report-stat">{{ $wigsDistributed }} wigs</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download PDF
                </button>
            </div>
            <div class="report-card">
                <h3><i class='bx bx-user-check'></i> Recipient Distribution Report</h3>
                <p>Matched and distributed wigs per recipient, with wig size and color data.</p>
                <span class="report-stat">{{ $recipientsServed }} served</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download PDF
                </button>
            </div>
            <div class="report-card">
                <h3><i class='bx bx-calendar-event'></i> Events Report</h3>
                <p>Attendance and participation data across all HairLink events in the period.</p>
                <span class="report-stat">{{ $eventsCount }} events</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download CSV
                </button>
            </div>
            <div class="report-card">
                <h3><i class='bx bx-group'></i> User Activity Report</h3>
                <p>New signups, active sessions, and role distribution for all users.</p>
                <span class="report-stat">{{ $usersCount }} users</span>
                <button class="report-download-btn" data-report-dl type="button">
                    <i class='bx bx-download'></i> Download CSV
                </button>
            </div>
        </div>
    </article>

    {{-- Monthly breakdown table --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-bar-chart-alt-2'></i> Monthly Activity Breakdown</h2>
            <span>Last 3 months</span>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Monetary Donations</th>
                        <th>Hair Submissions</th>
                        <th>Wigs Produced</th>
                        <th>Wigs Distributed</th>
                        <th>New Users</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($monthlyData as $month)
                    <tr>
                        <td>{{ $month->label }}</td>
                        <td>₱{{ number_format($month->monetary, 0) }}</td>
                        <td>{{ $month->hair_submissions }}</td>
                        <td>{{ $month->wigs_produced }}</td>
                        <td>{{ $month->wigs_distributed }}</td>
                        <td>{{ $month->new_users }}</td>
                    </tr>
                    @empty
                    <tr><td colspan="6" style="text-align:center;color:#7a687f;">No data available.</td></tr>
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
