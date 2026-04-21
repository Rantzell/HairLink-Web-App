@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Hair Stock')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
<section class="section-wrap reveal staff-page">
    <article class="stock-panel">
        <h2>Hair Stock</h2>

        <div class="stock-columns">
            @foreach(['Short', 'Medium', 'Long'] as $len)
                <section class="stock-col">
                    <h3>{{ $len }}</h3>
                    @foreach(['Black', 'Brown', 'Light'] as $col)
                        <div class="stock-row">
                            <span>{{ $col }}</span>
                            <strong>{{ $stock[$len][$col] ?? 0 }}</strong>
                        </div>
                    @endforeach
                </section>
            @endforeach
        </div>

        <p class="empty-note">Stock values are digital inventory summaries from approved and categorized hair donations.</p>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
