@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Wig Stock')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="staff-block" data-search-block>
        <div class="staff-bar">
            <h2>Wig Stock</h2>
            <div class="staff-tools">
                <input type="text" placeholder="Search stock" data-search-input>
                <button type="button" class="soft-btn">Search</button>
                <button type="button" class="ghost-btn">Filter</button>
                <button type="button" class="ghost-btn" data-print-trigger>Print</button>
            </div>
        </div>

        <div class="table-wrap">
            <table class="staff-table">
                <thead>
                    <tr>
                        <th>Stock ID</th>
                        <th style="width: 70px; text-align: center;">Photo</th>
                        <th>Batch Number</th>
                        <th>Size</th>
                        <th>Color</th>
                        <th>Date Delivered</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($wigs as $wig)
                        @php
                            $latestPhoto = null;
                            if ($wig->statusHistories) {
                                $historyWithPhoto = $wig->statusHistories->whereNotNull('metadata')->sortByDesc('created_at')->filter(function($hist) {
                                    return isset($hist->metadata['preview_photo']);
                                })->first();
                                if ($historyWithPhoto) {
                                    $latestPhoto = $historyWithPhoto->metadata['preview_photo'];
                                }
                            }
                        @endphp
                        <tr data-search-row>
                            <td style="vertical-align: middle;"><strong>{{ $wig->task_code }}</strong></td>
                            <td style="text-align: center; vertical-align: middle; padding: 0.3rem;">
                                @if($latestPhoto)
                                    <a href="{{ asset('storage/' . $latestPhoto) }}" target="_blank" class="file-thumbnail" style="width: 42px; height: 42px; display: inline-block; margin: 0 auto; box-shadow: 0 2px 5px rgba(0,0,0,0.08);">
                                        <img src="{{ asset('storage/' . $latestPhoto) }}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                                        <div class="preview-overlay">
                                            <i class='bx bx-search' style="font-size: 1.1rem;"></i>
                                        </div>
                                    </a>
                                @else
                                    <span style="color: #ccc; font-size: 0.75rem;">---</span>
                                @endif
                            </td>
                            <td style="vertical-align: middle;">{{ $wig->donation ? $wig->donation->reference : 'N/A' }}</td>
                            <td style="vertical-align: middle;">{{ $wig->target_length }}</td>
                            <td style="vertical-align: middle;">{{ $wig->target_color }}</td>
                            <td style="vertical-align: middle;">{{ $wig->updated_at->format('m/d/y') }}</td>
                            <td style="vertical-align: middle;"><span class="status-chip" style="background:#d4edda;color:#155724;border:none;">Arrived</span></td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 2rem;">No wigs currently in stock.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="pager">
            {{ $wigs->links() }}
        </div>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
