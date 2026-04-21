@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Delivery Per Batch')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="staff-block" data-search-block>
        <div class="staff-bar">
            <h2>Delivery Per Batch</h2>
            <div class="staff-tools">
                <input type="text" placeholder="Search batch" data-search-input>
                <button type="button" class="soft-btn">Search</button>
                <button type="button" class="ghost-btn" data-print-trigger>Print</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="staff-table">
                <thead>
                    <tr>
                        <th>Batch #</th>
                        <th>Date and Time</th>
                        <th>Number of wigs per batch</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($batches as $batch)
                    <tr data-search-row>
                        <td>Batch {{ $batch->batch_number }}</td>
                        <td>{{ $batch->date->format('m/d/y H:i:s') }}</td>
                        <td>{{ $batch->count }}</td>
                        <td>{{ $batch->status }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="4" style="text-align:center;color:#7a687f;">No delivery batches found.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
