@extends('layouts.dashboard')

@section('title', 'HairLink | Donation Tracking')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/donor-module.css') }}">
@endpush

@section('content')
    <section class="section-wrap donor-module-page reveal">
        <header class="module-head">
            <h1>My Donation Tracking</h1>
            <p>Monitor status changes from submission to completion and certificate release.</p>
            <div class="tracking-tools">
                <input id="trackingFilter" type="text" placeholder="Search by reference, status, hair details...">
                <a class="soft-btn" href="{{ route('donor.donate') }}">Submit Another Donation</a>
            </div>
        </header>

        <article class="module-card">
            <div class="table-wrap">
                <table class="tracking-table">
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Hair Length</th>
                            <th>Certificate</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="trackingTableBody">
                        @forelse($donations as $donation)
                        <tr>
                            <td><strong>{{ $donation->reference }}</strong></td>
                            <td>{{ $donation->created_at->format('Y-m-d') }}</td>
                            <td><span class="status-pill status-{{ str_replace(' ', '-', strtolower($donation->status)) }}">{{ $donation->status }}</span></td>
                            <td>{{ $donation->hair_length ?? 'N/A' }}</td>
                            <td>
                                @if(in_array($donation->status, ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received']))
                                    <a href="{{ route('donor.certificate') }}" class="link-text">View Certificate</a>
                                @else
                                    <span style="color:#ada9b0;">N/A</span>
                                @endif
                            </td>
                            <td><a href="{{ route('donor.tracking.detail', $donation->reference) }}" class="ghost-btn">Details</a></td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="6" style="text-align:center; padding: 2rem; color: #7a687f;">No donation records yet. Submit your first hair donation to begin tracking.</td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/donor-module.js') }}" defer></script>
@endpush
