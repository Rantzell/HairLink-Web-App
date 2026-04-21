@extends('layouts.dashboard')

@section('title', 'HairLink | Production Monitoring')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/wigmaker-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal wigmaker-page">
    <div class="section-title-block">
        <h1>Production Progress Monitoring</h1>
        <p>Managed your assigned wig production tasks and update progress in real-time.</p>
    </div>

    <div class="status-cards">
        <article class="status-card">
            <h2>{{ count($tasks) }}</h2>
            <p>Total Tasks</p>
        </article>
        <article class="status-card">
            <h2>{{ $queuedCount }}</h2>
            <p>Queued</p>
        </article>
        <article class="status-card">
            <h2>{{ $inProgressCount }}</h2>
            <p>In Progress</p>
        </article>
        <article class="status-card">
            <h2>{{ $completedCount }}</h2>
            <p>Completed</p>
        </article>
    </div>

    <div class="search-bar-wrap" style="margin-bottom: 20px;">
        <div class="search-input-group" style="position: relative; max-width: 400px;">
            <i class='bx bx-search' style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #7f6b88;"></i>
            <input type="text" data-search-input placeholder="Filter tasks by Task ID, Reference, or status..." style="padding-left: 38px;">
        </div>
    </div>

    <article class="staff-block">
        <div class="batch-line">
            <strong>Your Active Tasks</strong>
            <span>{{ $tasks->count() }} assignments</span>
        </div>

        @forelse($tasks as $task)
            @php
                $normStatus = str_replace(' ', '-', strtolower($task->status));
                // Map wigmaker statuses to donor flow statuses for visual consistency if needed
                // assigned -> ready/in-queue
                // processing -> in-progress
                // completed -> completed
                $displayStatus = $normStatus;
                if ($normStatus === 'assigned') $displayStatus = 'in-queue';
                if ($normStatus === 'processing') $displayStatus = 'in-progress';
            @endphp
            <article class="tracking-item" data-track-card data-card-id="{{ $task->task_code }}" data-current-status="{{ $displayStatus }}" data-card-type="donor">
                <div class="tracking-head">
                    <strong>Task # {{ $task->task_code }}</strong>
                    <span class="status-chip" data-status-chip>{{ ucfirst($task->status) }}</span>
                </div>
                <div class="tracking-meta">
                    <span>Target: {{ $task->target_length }} / {{ $task->target_color }}</span>
                    <span>Due: {{ $task->due_date ?? 'No deadline' }}</span>
                    @if($task->donation)
                        <span style="color: #a1285d; font-weight: 600;">Ref: {{ $task->donation->reference }}</span>
                    @endif
                </div>
                
                {{-- Unified Stage Row --}}
                <div class="stage-row">
                    <div class="stage" data-stage="received"><i class='bx bx-package'></i><small>Received</small></div>
                    <div class="stage" data-stage="in-queue"><i class='bx bx-time-five'></i><small>In Queue</small></div>
                    <div class="stage" data-stage="in-progress"><i class='bx bxs-star'></i><small>In Progress</small></div>
                    <div class="stage" data-stage="completed"><i class='bx bx-heart'></i><small>Completed</small></div>
                    <div class="stage" data-stage="wig-received"><i class='bx bx-gift'></i><small>Wig Received</small></div>
                </div>

                <div class="track-actions">
                    <a href="{{ route('wigmaker.task.detail', $task->task_code) }}" class="soft-btn" style="text-decoration: none; display: inline-block; text-align: center;">View Production Details</a>
                </div>

                <p class="tracking-footnote" data-last-updated>Last updated: {{ $task->updated_at->diffForHumans() }}</p>
            </article>
        @empty
            <div style="padding: 2rem; text-align: center; color: #665772; background: white; border-radius: 16px; border: 1px dashed #ead7e8;">
                <i class='bx bx-info-circle' style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: #ad246d;"></i>
                No active production tasks assigned to you yet.
            </div>
        @endforelse
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/wigmaker-module.js') }}" defer></script>
@endpush
