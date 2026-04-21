@extends('layouts.auth')

@section('title', 'HairLink | Login')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/login.css') }}">
@endpush

@section('content')
    <main class="auth-shell">
        @include('partials.auth-container', ['initialMode' => 'login'])
    </main>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/login.js') }}" defer></script>
@endpush
