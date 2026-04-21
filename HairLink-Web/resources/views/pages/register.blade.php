@extends('layouts.auth')

@section('title', 'HairLink | Register')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/register.css') }}">
@endpush

@section('content')
    <main class="auth-shell">
        @include('partials.auth-container', ['initialMode' => 'register'])
    </main>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/register.js') }}" defer></script>
@endpush
