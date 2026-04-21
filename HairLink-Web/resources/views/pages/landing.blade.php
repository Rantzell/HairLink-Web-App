<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HairLink | Strand Up For Cancer</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="{{ asset('assets/css/landing.css') }}?v={{ time() }}">

    @auth
        @if(auth()->user()->role == 'donor' || auth()->user()->role == 'recipient')
            <link rel="stylesheet" href="{{ asset('assets/css/dashboard-base.css') }}">
        @endif
    @endauth
</head>
<body>
    <x-landing.header />
    <x-landing.hero />
    <x-landing.services />
    <x-landing.about />
    <x-landing.contact />
    <x-landing.footer />

    <script src="{{ asset('assets/js/landing.js') }}" defer></script>
    @auth
        @if(auth()->user()->role == 'donor' || auth()->user()->role == 'recipient')
            <script src="{{ asset('assets/js/dashboard.js') }}" defer></script>
        @endif
    @endauth
</body>
</html>

