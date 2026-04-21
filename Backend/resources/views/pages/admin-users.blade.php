@extends('layouts.dashboard')

@section('title', 'HairLink | Admin User Management')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    <header style="padding:0.6rem 0 0.2rem">
        <p style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9b2f69;margin-bottom:0.2rem;">Admin · Users</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.5rem,3vw,2.1rem);color:#261d2b;">User Management</h1>
        <p style="color:#665772;font-size:0.88rem;margin-top:0.25rem;">View and manage all registered accounts across every role.</p>
    </header>
    {{-- Role summary strip --}}
    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Donors</span>
            <strong>{{ $donorCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Recipients</span>
            <strong>{{ $recipientCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Staff</span>
            <strong>{{ $staffCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Wigmakers</span>
            <strong>{{ $wigmakerCount }}</strong>
        </div>
    </div>

    {{-- User table --}}
    <article class="admin-card" data-admin-search-block>
        <div class="admin-bar">
            <h2 class="admin-card-head" style="margin-bottom:0;">
                <i class='bx bx-group' style="color:#cf2f84;"></i> All Users
            </h2>
            <div class="admin-tools">
                <input type="text" placeholder="Search name, email, or role…" data-admin-search-input aria-label="Search users">
                {{-- <button class="soft-btn" data-admin-search-btn type="button">Search</button> --}}
                <button class="ghost-btn" type="button" data-admin-print>Export</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Registered</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($users as $user)
                        <tr data-admin-search-row>
                            <td data-user-name>{{ $user->first_name }} {{ $user->last_name }}</td>
                            <td>{{ $user->email }}</td>
                            <td><span class="role-badge {{ $user->role }}">{{ ucfirst($user->role) }}</span></td>
                            <td>{{ $user->created_at->format('M d, Y') }}</td>
                            <td>
                                @if($user->email_verified_at)
                                    <span class="admin-chip active" data-user-chip="active">Verified</span>
                                @else
                                    <span class="admin-chip inactive" data-user-chip="inactive">Unverified</span>
                                @endif
                            </td>
                            <td>
                                <button class="ghost-btn" data-user-toggle data-user-id="{{ $user->id }}" type="button">
                                    {{ $user->is_active ? 'Deactivate' : 'Activate' }}
                                </button>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="admin-pager">
            {{ $users->links() }}
        </div>
    </article>

</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin-module.js') }}" defer></script>
@endpush
