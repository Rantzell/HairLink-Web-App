@extends('layouts.dashboard')

@section('title', 'HairLink | Partner Wigmaker Dashboard')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/wigmaker-module.css') }}">
@endpush

@section('content')
    @php
        $queuedCount = collect($tasks)->where('status', 'assigned')->count();
        $inProgressCount = collect($tasks)->where('status', 'processing')->count();
        $completedCount = collect($tasks)->where('status', 'completed')->count();
    @endphp

    <section class="section-wrap reveal wigmaker-page">
        <div class="section-title-block">
            <h1>Partner Wigmaker Workspace</h1>
            <p>Manage assigned wig production tasks and update progress stages for staff and admin monitoring.</p>
        </div>

        <div class="status-cards">
            <article class="status-card">
                <h2>{{ count($tasks) }}</h2>
                <p>Total Assigned Tasks</p>
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

        <article class="task-board" id="tasksBoard">
            <div class="task-board-head">
                <h2>Production Tasks</h2>
                <p>Every status update notifies relevant staff and administrators.</p>
            </div>

            <div class="task-filters" role="group" aria-label="Filter tasks by status">
                <button type="button" class="filter-btn active" data-filter="all">All</button>
                <button type="button" class="filter-btn" data-filter="queued">Queued</button>
                <button type="button" class="filter-btn" data-filter="in-progress">In Progress</button>
                <button type="button" class="filter-btn" data-filter="completed">Completed</button>
            </div>

            <div class="task-table-wrap">
                <table class="task-table" aria-label="Assigned production tasks">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Dates</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($tasks as $task)
                            <tr data-task-row data-task-status="{{ $task->status }}">
                                <td>
                                    <strong>{{ $task->task_code }}</strong>
                                </td>
                                <td>
                                    <span class="status-pill status-{{ $task->status }}" data-status-pill>{{ str_replace('-', ' ', ucfirst($task->status)) }}</span>
                                </td>
                                <td>
                                    <div style="display: flex; flex-direction: column; gap: 2px;">
                                        <small style="color: #8c7895;">Start: <strong>{{ $task->created_at->format('Y-m-d h:i A') }}</strong></small>
                                        @if($task->status === 'completed')
                                            <small style="color: #28a745;">End: <strong>{{ $task->updated_at->format('Y-m-d h:i A') }}</strong></small>
                                        @else
                                            <small style="color: #7f2958;">Target: <strong>{{ \Carbon\Carbon::parse($task->due_date)->format('Y-m-d') }} 05:00 PM</strong></small>
                                        @endif
                                    </div>
                                </td>
                                <td>
                                    <a class="ghost-btn" href="{{ route('wigmaker.task.detail', $task->task_code) }}">Open Task</a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </article>

        <div class="progress-note" data-progress-note hidden>
            Production status updated. Staff and admin will be notified.
        </div>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/wigmaker-module.js') }}" defer></script>
@endpush
