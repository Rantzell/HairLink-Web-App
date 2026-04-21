@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Donor Hair Verification')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="staff-block" data-search-block>
        <div class="staff-bar">
            <h2>Donor Hair Verification Queue</h2>
            <div class="staff-tools">
                <input type="text" placeholder="Search donor or reference" data-search-input>
                <select>
                    <option>All Status</option>
                    <option>Submitted</option>
                    <option>Approved</option>
                    <option>Rejected</option>
                </select>
            </div>
        </div>

        <div class="table-wrap">
            <table class="staff-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Donor</th>
                        <th>Hair Details</th>
                        <th>Submitted</th>
                        <th>Current Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($donations as $donation)
                        <tr data-search-row>
                            <td>{{ $donation->reference }}</td>
                            <td>{{ $donation->user->first_name ?? 'Unknown' }} {{ $donation->user->last_name ?? '' }}</td>
                            <td>{{ $donation->hair_length }} / {{ $donation->hair_color }} / {{ $donation->hair_condition }}</td>
                            <td>{{ $donation->created_at->format('m/d/y') }}</td>
                            <td><span class="status-chip">{{ $donation->status }}</span></td>
                            <td><a class="ghost-btn" href="{{ route('staff.verification.detail', ['type' => 'donor', 'reference' => $donation->reference]) }}">Review</a></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" style="text-align: center;">No donations pending verification.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="empty-note">Manual staff validation is required before inventory intake.</div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
