@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Rule-based Matching')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="match-layout">
        <section class="match-left">
            <h2>Select Recipient</h2>

            @php
                $first = $recipients->first();
            @endphp

            <div class="recipient-facts">
                <strong data-recipient-name>{{ $first->user->first_name ?? 'Select' }} {{ $first->user->last_name ?? 'Recipient' }}</strong>
                <span>Preferred Wig Size: <strong data-recipient-length>{{ ucfirst($first->wig_length ?? 'N/A') }}</strong></span>
                <span>Preferred Color: <strong data-recipient-color>{{ ucfirst($first->wig_color ?? 'N/A') }}</strong></span>
            </div>

            <div class="recipient-list">
                @forelse($recipients as $idx => $rec)
                    <button type="button" class="recipient-btn {{ $idx === 0 ? 'active' : '' }}" 
                        data-recipient-btn 
                        data-reference="{{ $rec->reference }}"
                        data-name="{{ ($rec->user->first_name ?? 'Unknown') . ' ' . ($rec->user->last_name ?? 'User') }}" 
                        data-length="{{ $rec->wig_length }}" 
                        data-color="{{ $rec->wig_color }}">
                        {{ $rec->user->first_name ?? 'Unknown' }} {{ $rec->user->last_name ?? 'User' }} <b>{{ $rec->status }}</b>
                    </button>
                @empty
                    <p>No recipients pending matching.</p>
                @endforelse
            </div>
        </section>

        <section class="match-right">
            <h2>Available Wigs</h2>
            <div class="match-tools">
                <label for="matchMode">Display:</label>
                <select id="matchMode" data-match-mode>
                    <option value="high" selected>High Matches (>= 85%)</option>
                    <option value="top3">Top 3 Highest Matches</option>
                    <option value="all">All Available Wigs</option>
                </select>
            </div>
            <p class="match-rule-note">Ranking rule: highest compatibility score first. Tie-breaker: oldest in-stock wig first (FIFO).</p>
            <div class="wig-options">
                @forelse($wigs as $wig)
                    <article class="wig-option" data-wig-card data-length="{{ $wig->target_length }}" data-color="{{ $wig->target_color }}" data-available="true" data-stock-date="{{ $wig->updated_at->format('Y-m-d') }}">
                        @php
                            $sizeLabel = ucfirst($wig->target_length);
                            // Fallback for legacy data
                            if (str_contains(strtolower($sizeLabel), '10 to 14')) $sizeLabel = 'Short';
                            if (str_contains(strtolower($sizeLabel), '15 to 20')) $sizeLabel = 'Medium';
                            if (str_contains(strtolower($sizeLabel), 'more than 20')) $sizeLabel = 'Long';
                        @endphp
                        <h4>Stock #{{ $wig->task_code }}</h4>
                        <p>Wig Size: <strong>{{ $sizeLabel }}</strong></p>
                        <p>Color: <strong>{{ ucfirst(str_replace('-', ' ', $wig->target_color)) }}</strong></p>
                        <p>Availability: In Stock</p>
                        <p class="compat-score">Compatibility Score: <span data-score>0%</span></p>
                        <p class="score-breakdown" data-score-breakdown>Calculating...</p>
                        <button class="soft-btn" type="button" data-match-btn data-wig-id="{{ $wig->id }}">Choose this wig</button>
                    </article>
                @empty
                    <p>No wigs currently in stock.</p>
                @endforelse
            </div>
            <p class="empty-note" data-match-empty hidden>No high-match wig found for the current recipient. Switch to "All Available Wigs" to review more options.</p>
        </section>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
