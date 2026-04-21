@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Recipient Request Verification')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="staff-block" data-search-block>
        <div class="staff-bar">
            <h2>Recipient Request Verification Queue</h2>
            <div class="staff-tools">
                <input type="text" placeholder="Search recipient or reference" data-search-input>
                <select>
                    <option>All Status</option>
                    <option>Submitted</option>
                    <option>Under Review</option>
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
                        <th>Recipient</th>
                        <th>Wig Preference</th>
                        <th>Story</th>
                        <th>Current Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($requests as $req)
                        <tr data-search-row>
                            <td>{{ $req->reference }}</td>
                            <td>{{ $req->user->first_name ?? 'Unknown' }} {{ $req->user->last_name ?? '' }}</td>
                            <td>{{ ucfirst($req->wig_length) }} / {{ ucfirst($req->wig_color) }}</td>
                            <td>{{ Str::limit($req->story, 50) }}</td>
                            <td><span class="status-chip {{ strtolower($req->status) }}">{{ $req->status }}</span></td>
                            <td><a class="ghost-btn" href="{{ route('staff.verification.detail', ['type' => 'recipient', 'reference' => $req->reference]) }}">Review</a></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" style="text-align: center;">No recipient requests pending.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="empty-note">Approval decision updates recipient tracking and matching eligibility.</div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
