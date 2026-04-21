<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="app-base-url" content="{{ url('/') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', config('app.name', 'HairLink'))</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&display=swap" rel="stylesheet">
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="{{ asset('assets/css/dashboard-base.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recipient-module.css') }}">
    <style>
        @media print {
            .dash-header, .dash-nav,
            .action-row, .action-buttons, .form-actions,
            #printCertificateBtn, [data-dash-burger], [data-dash-links] {
                display: none !important;
            }
            body { background: #fff !important; }
            .certificate-paper {
                box-shadow: none !important;
                border: 2px solid #ddd !important;
                margin: 0 !important;
                page-break-inside: avoid;
            }
            .module-card, .certificate-shell { box-shadow: none !important; }
        }
    </style>
    @stack('styles')
</head>
<body>
    <x-dashboard.navbar />

    <main class="dash-main">
        @yield('content')
    </main>

    <script src="{{ asset('assets/js/dashboard.js') }}" defer></script>
    <script src="{{ asset('assets/js/recipient-module.js') }}" defer></script>
    @stack('scripts')
</body>
</html>

