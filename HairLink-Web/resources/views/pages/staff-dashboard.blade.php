@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Operations Dashboard')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <header class="staff-hero">
        <div class="staff-hero-copy">
            <p class="staff-kicker">Operations Center</p>
            <h1>Staff Operations Workspace</h1>
            <p>Monitor verification, inventory, production tracking, matching, and distribution workflows.</p>
        </div>
        <div class="staff-hero-badge">
            <i class='bx bxs-badge-check'></i>
            <span>Live Staff View</span>
        </div>
    </header>

    <div class="quick-stat-grid">
        <article class="quick-stat"><small>Donations</small><h2>{{ $pendingDonations ?? 0 }}</h2><p>Pending Hair Donations</p></article>
        <article class="quick-stat"><small>Inventory</small><h2>{{ $totalStock ?? 0 }}</h2><p>Hair Inventory Records</p></article>
        <article class="quick-stat"><small>Production</small><h2>{{ $productionCount ?? 0 }}</h2><p>Wig Builds In Progress</p></article>
        <article class="quick-stat"><small>Stock</small><h2>{{ $wigStockCount ?? 0 }}</h2><p>Completed Wig Stock</p></article>
        <article class="quick-stat"><small>Requests</small><h2>{{ $pendingRequests ?? 0 }}</h2><p>Pending Recipient Requests</p></article>
    </div>

    <article class="staff-card">
        <div class="staff-section-head">
            <h2>Verification Desk</h2>
            <span>Review and decision workflow</span>
        </div>
        <div class="staff-actions two-col">
            <a class="staff-action-link" href="{{ route('staff.donor-verification') }}">
                <h3>Donor Hair Verification</h3>
                <p>Review donor hair submissions and approve or reject with remarks.</p>
            </a>
            <a class="staff-action-link" href="{{ route('staff.recipient-verification') }}">
                <h3>Recipient Request Verification</h3>
                <p>Validate recipient requests and supporting medical documentation.</p>
            </a>
        </div>
    </article>

    <article class="staff-card">
        <div class="staff-section-head">
            <h2>Production and Inventory</h2>
            <span>Wigmaker tracking and stock control</span>
        </div>
        <div class="staff-actions four-col">
            <a class="staff-action-link" href="{{ route('staff.realtime-tracking') }}">
                <h3>Real-time Wigmaker Tracking</h3>
                <p>Monitor partner wigmaker progress and update stage movement.</p>
            </a>
            <a class="staff-action-link" href="{{ route('staff.delivery-batches') }}">
                <h3>Delivery Per Batch</h3>
                <p>Track delivery batches and document processing status.</p>
            </a>
            <a class="staff-action-link" href="{{ route('staff.hair-stock') }}">
                <h3>Hair Stock</h3>
                <p>View available stock by size and hair color categories.</p>
            </a>
            <a class="staff-action-link" href="{{ route('staff.wig-stock') }}">
                <h3>Wig Stock</h3>
                <p>Maintain completed wig inventory records and statuses.</p>
            </a>
        </div>
    </article>

    <article class="staff-card">
        <div class="staff-section-head">
            <h2>Matching and Allocation</h2>
            <span>Recipient pairing and release preparation</span>
        </div>
        <div class="staff-actions" style="grid-template-columns: 1fr;">
            <a class="staff-action-link" href="{{ route('staff.recipient-matching-list') }}">
                <h3>Recipient Matching List</h3>
                <p>Review matched wigs and release scheduling progress.</p>
            </a>
        </div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
