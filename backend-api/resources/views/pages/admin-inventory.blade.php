@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Inventory')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    {{-- ── Page header ─────────────────────────────────────── --}}
    <header style="padding:0.6rem 0 0.2rem">
        <p style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9b2f69;margin-bottom:0.2rem;">Admin · Inventory</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.5rem,3vw,2.1rem);color:#261d2b;">Check Inventory</h1>
        <p style="color:#665772;font-size:0.88rem;margin-top:0.25rem;">Complete view of all hair stock, wig stock, and donation records.</p>
    </header>

    {{-- ── Inventory totals ────────────────────────────────── --}}
    @php
        $totalShort = $stock['Short']['Black'] + $stock['Short']['Brown'] + $stock['Short']['Light'];
        $totalMedium = $stock['Medium']['Black'] + $stock['Medium']['Brown'] + $stock['Medium']['Light'];
        $totalLong = $stock['Long']['Black'] + $stock['Long']['Brown'] + $stock['Long']['Light'];
    @endphp
    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Hair Records</span>
            <strong>{{ $totalHairRecords }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Wig Stock</span>
            <strong>{{ $wigCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>All Donations</span>
            <strong>{{ $allDonationsCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Completed Hair</span>
            <strong>{{ $totalHairRecords }}</strong>
        </div>
    </div>

    {{-- ══════════════════════════════════════════════════════
         SECTION 1 — Hair Stock
    ════════════════════════════════════════════════════════ --}}
    <article class="admin-card">
        <h3 class="inv-section-title">
            <i class='bx bx-transfer-alt'></i> Hair Stock
            <span style="font-size:0.8rem;font-weight:400;color:#7a687f;font-family:'Manrope',sans-serif;margin-left:auto;">
                Approved &amp; categorized donations
            </span>
        </h3>

        <div class="hair-stock-grid">
            @foreach(['Short', 'Medium', 'Long'] as $length)
            <div class="hair-stock-col">
                <h4>{{ $length }}</h4>
                @foreach(['Black', 'Brown', 'Light'] as $color)
                <div class="hair-stock-row"><span>{{ $color }}</span><strong>{{ $stock[$length][$color] }}</strong></div>
                @endforeach
                @php $total = $stock[$length]['Black'] + $stock[$length]['Brown'] + $stock[$length]['Light']; @endphp
                <div class="hair-stock-row" style="border-top:1px solid #ead7e8;margin-top:0.3rem;padding-top:0.3rem;">
                    <span style="font-weight:700;">Total {{ $length }}</span><strong>{{ $total }}</strong>
                </div>
            </div>
            @endforeach
        </div>
        <p class="admin-empty-note" style="padding-top:0.65rem;">Combined total: <strong>{{ $totalHairRecords }}</strong> hair records across all sizes and colors.</p>
    </article>

    {{-- ══════════════════════════════════════════════════════
         SECTION 2 — Wig Stock
    ════════════════════════════════════════════════════════ --}}
    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <h3 class="inv-section-title" style="margin-bottom:0;border-bottom:none;padding-bottom:0;">
                <i class='bx bx-package'></i> Wig Stock
            </h3>
            <div class="admin-tools">
                <input type="text" placeholder="Search stock…" data-admin-search-input aria-label="Search wig stock">
                <button class="soft-btn" data-admin-search-btn type="button">Search</button>
                <button class="ghost-btn" type="button" data-admin-print>Print</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Task Code</th>
                        <th>Wigmaker</th>
                        <th>Wig Size</th>
                        <th>Color</th>
                        <th>Date Completed</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($wigStock as $wig)
                    <tr data-admin-search-row>
                        <td>{{ $wig->task_code }}</td>
                        <td>{{ $wig->wigmaker->first_name ?? '' }} {{ $wig->wigmaker->last_name ?? '' }}</td>
                        <td>{{ $wig->target_length }}</td>
                        <td>{{ $wig->target_color }}</td>
                        <td>{{ $wig->updated_at->format('m/d/y') }}</td>
                        <td><span class="admin-chip available">Completed</span></td>
                    </tr>
                    @empty
                    <tr><td colspan="6" style="text-align:center;color:#7a687f;">No completed wigs in stock.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </article>

    {{-- ══════════════════════════════════════════════════════
         SECTION 3 — Hair Donation Records
    ════════════════════════════════════════════════════════ --}}
    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <h3 class="inv-section-title" style="margin-bottom:0;border-bottom:none;padding-bottom:0;">
                <i class='bx bx-user-voice'></i> Hair Donation Records
            </h3>
            <div class="admin-tools">
                <input type="text" placeholder="Search donor or reference…" data-admin-search-input aria-label="Search donations">
                <button class="soft-btn" data-admin-search-btn type="button">Search</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Donor Name</th>
                        <th>Length</th>
                        <th>Color</th>
                        <th>Date Submitted</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($allDonations as $donation)
                    <tr data-admin-search-row>
                        <td>{{ $donation->reference }}</td>
                        <td>{{ $donation->user->first_name ?? '' }} {{ $donation->user->last_name ?? '' }}</td>
                        <td>{{ $donation->hair_length }}</td>
                        <td>{{ $donation->hair_color }}</td>
                        <td>{{ $donation->created_at->format('M d, Y') }}</td>
                        <td>
                            @php
                                $chipClass = match($donation->status) {
                                    'Completed' => 'approved',
                                    'Rejected' => 'rejected',
                                    default => 'pending',
                                };
                            @endphp
                            <span class="admin-chip {{ $chipClass }}">{{ $donation->status }}</span>
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="6" style="text-align:center;color:#7a687f;">No donation records found.</td></tr>
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
