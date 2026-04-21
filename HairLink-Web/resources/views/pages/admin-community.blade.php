@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Community')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    <header style="padding:0.6rem 0 0.2rem">
        <p style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9b2f69;margin-bottom:0.2rem;">Admin · Community</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.5rem,3vw,2.1rem);color:#261d2b;">Community Forum</h1>
        <p style="color:#665772;font-size:0.88rem;margin-top:0.25rem;">Moderate posts, approve threads, and pin important announcements.</p>
    </header>

    @if (session('success'))
        <div style="background:#e9f9f0; color:#1a7a47; border:1px solid #a8e5c4; padding:0.8rem 1.2rem; border-radius:8px; margin-bottom:1.5rem; font-size:0.9rem; font-weight:600;">
            {{ session('success') }}
        </div>
    @endif

    {{-- Summary --}}
    <div class="inv-summary-grid">
        <div class="inv-summary-item">
            <span>Total Posts</span>
            <strong>{{ count($posts) }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Recent Posts (7 days)</span>
            <strong>{{ $recentCount }}</strong>
        </div>
        <div class="inv-summary-item">
            <span>Pinned</span>
            <strong>3</strong>
        </div>
        <div class="inv-summary-item">
            <span>Flagged</span>
            <strong>0</strong>
        </div>
    </div>

    {{-- Pending posts --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-time-five'></i> Pending Posts</h2>
            <span>Awaiting approval</span>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Author</th>
                        <th>Role</th>
                        <th>Post Title</th>
                        <th>Submitted</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($posts->take(5) as $post)
                    <tr>
                        <td>{{ $post->user ? $post->user->name : 'Anonymous' }}</td>
                        <td><span class="role-badge donor">{{ $post->user ? ucfirst($post->user->role) : 'User' }}</span></td>
                        <td>{{ Str::limit($post->content, 40) }}</td>
                        <td>{{ $post->created_at->format('M d, Y') }}</td>
                            <form action="{{ route('admin.community.delete', $post->id) }}" method="POST" onsubmit="return confirm('Are you sure you want to delete this community post?');" style="margin:0;">
                                @csrf
                                @method('DELETE')
                                <button class="ghost-btn" style="font-size:0.75rem;padding:0.25rem 0.6rem; color: #d81b60;" type="submit">Delete</button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="5" style="text-align:center;">No recent posts.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </article>

    {{-- Pinned posts --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-pin'></i> Pinned Announcements</h2>
            <span>Visible to all users</span>
        </div>

        <div class="event-list">
            <div class="event-item">
                <div class="event-date-block" style="background:#7f2958;">
                    <i class='bx bx-pin' style="font-size:1.3rem;display:block;margin: 0.3rem auto;text-align:center;"></i>
                </div>
                <div class="event-body">
                    <h4>New Hair Donation Minimum Length Policy</h4>
                    <p>All donations must be at least 10 inches (25 cm) in length. Updated: Mar 2026.</p>
                </div>
            </div>
            <div class="event-item">
                <div class="event-date-block" style="background:#7f2958;">
                    <i class='bx bx-pin' style="font-size:1.3rem;display:block;margin: 0.3rem auto;text-align:center;"></i>
                </div>
                <div class="event-body">
                    <h4>Upcoming Hair Drive: April 5, 2026 – Quezon City</h4>
                    <p>Walk-in donations accepted at YMCA QC Branch from 9 AM to 5 PM.</p>
                </div>
            </div>
            <div class="event-item">
                <div class="event-date-block" style="background:#7f2958;">
                    <i class='bx bx-pin' style="font-size:1.3rem;display:block;margin: 0.3rem auto;text-align:center;"></i>
                </div>
                <div class="event-body">
                    <h4>Wig Request Portal Now Open</h4>
                    <p>Eligible recipients can now submit requests online. Required documents listed in FAQ.</p>
                </div>
            </div>
        </div>
    </article>

</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin-module.js') }}" defer></script>
@endpush
