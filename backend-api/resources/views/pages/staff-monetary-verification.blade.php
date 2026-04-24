@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Monetary Verification')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="staff-block" data-search-block>
        <div class="staff-bar">
            <h2>Monetary Donation Verification Queue</h2>
            <div class="staff-tools">
                <input type="text" placeholder="Search donor or reference" data-search-input>
                <select>
                    <option>All Status</option>
                    <option>Submitted</option>
                    <option>Completed</option>
                    <option>Failed</option>
                </select>
            </div>
        </div>

        <div class="table-wrap">
            <table class="staff-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Donor</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Submitted</th>
                        <th>Current Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($monetaryDonations as $donation)
                        <tr data-search-row>
                            <td>{{ $donation->reference_number }}</td>
                            <td>{{ $donation->user->first_name ?? $donation->name }} {{ $donation->user->last_name ?? '' }}</td>
                            <td>{{ $donation->currency }} {{ number_format($donation->amount, 2) }}</td>
                            <td>{{ $donation->payment_method }}</td>
                            <td>{{ $donation->created_at->format('m/d/y') }}</td>
                            <td><span class="status-chip status-{{ strtolower($donation->status) }}">{{ $donation->status }}</span></td>
                            <td><a class="ghost-btn" href="{{ route('staff.monetary-verification.detail', ['id' => $donation->id]) }}">Review</a></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" style="text-align: center;">No monetary donations pending verification.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="empty-note">Manual staff validation is required to confirm receipt of funds.</div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
