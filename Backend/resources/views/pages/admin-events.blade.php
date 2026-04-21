@extends('layouts.dashboard')

@section('title', 'HairLink | Admin Events')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal admin-page">

    <header style="padding:0.6rem 0 0.2rem">
        <p style="font-size:0.72rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#9b2f69;margin-bottom:0.2rem;">Admin · Events</p>
        <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.5rem,3vw,2.1rem);color:#261d2b;">Update Events</h1>
        <p style="color:#665772;font-size:0.88rem;margin-top:0.25rem;">Schedule and publish HairLink community events and donation drives.</p>
    </header>

    {{-- Create event form --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-calendar-plus'></i> Add New Event</h2>
        </div>

        <form data-event-form id="eventForm" data-action-url="{{ route('admin.events.store') }}" style="display:grid;gap:0.7rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.7rem;">
                <div>
                    <label style="font-size:0.8rem;font-weight:700;color:#3b2e43;display:block;margin-bottom:0.25rem;">Event Title *</label>
                    <input name="event_title" type="text" placeholder="e.g. Hair Donation Drive"
                        style="width:100%;border:1px solid #ddc8e3;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.88rem;font-family:inherit;background:#fdfaff;color:#261d2b;">
                </div>
                <div>
                    <label style="font-size:0.8rem;font-weight:700;color:#3b2e43;display:block;margin-bottom:0.25rem;">Date</label>
                    <input name="event_date" type="date"
                        style="width:100%;border:1px solid #ddc8e3;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.88rem;font-family:inherit;background:#fdfaff;color:#261d2b;">
                </div>
            </div>
            <div>
                <label style="font-size:0.8rem;font-weight:700;color:#3b2e43;display:block;margin-bottom:0.25rem;">Description</label>
                <textarea name="event_description" rows="3" placeholder="Brief description of the event…"
                    style="width:100%;border:1px solid #ddc8e3;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.88rem;font-family:inherit;background:#fdfaff;color:#261d2b;resize:vertical;"></textarea>
            </div>
            <div>
                <label style="font-size:0.8rem;font-weight:700;color:#3b2e43;display:block;margin-bottom:0.25rem;">Location</label>
                <input name="event_location" type="text" placeholder="e.g. YMCA Community Hall"
                    style="width:100%;border:1px solid #ddc8e3;border-radius:8px;padding:0.45rem 0.7rem;font-size:0.88rem;font-family:inherit;background:#fdfaff;color:#261d2b;">
            </div>
            <div style="display:flex;gap:0.5rem;">
                <button class="soft-btn" type="submit">Save Event</button>
                <button class="ghost-btn" type="reset">Clear</button>
            </div>
        </form>
    </article>

    {{-- Upcoming events --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-calendar-event'></i> Upcoming Events</h2>
            <span>{{ count($upcomingEvents) }} scheduled</span>
        </div>

        <div class="event-list">
            @forelse($upcomingEvents as $event)
            <div class="event-item">
                <div class="event-date-block">
                    <span class="event-day">{{ \Carbon\Carbon::parse($event->date)->format('d') }}</span>
                    <span class="event-month">{{ \Carbon\Carbon::parse($event->date)->format('M') }}</span>
                </div>
                <div class="event-body">
                    <h4>{{ $event->title }}</h4>
                    <p>{{ $event->description }} - {{ $event->location }}</p>
                </div>
            </div>
            @empty
            <p>No upcoming events.</p>
            @endforelse
        </div>
    </article>

    {{-- Past events table --}}
    <article class="admin-card">
        <div class="admin-card-head">
            <h2><i class='bx bx-history'></i> Past Events</h2>
            <span>Last 90 days</span>
        </div>

        <div class="table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Location</th>
                        <th>Participants</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($pastEvents as $event)
                    <tr>
                        <td>{{ $event->title }}</td>
                        <td>{{ \Carbon\Carbon::parse($event->date)->format('M d, Y') }}</td>
                        <td>{{ $event->location }}</td>
                        <td>{{ $event->participants_count }}</td>
                        <td><span class="admin-chip arrived">{{ $event->status }}</span></td>
                    </tr>
                    @empty
                    <tr><td colspan="5" style="text-align:center;">No past events.</td></tr>
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
