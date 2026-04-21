<header class="site-header" id="top">
    @auth
        @if(auth()->user()->role == 'donor' || auth()->user()->role == 'recipient')
            <x-dashboard.navbar />
        @else
            <x-landing.navbar />
        @endif
    @else
        <x-landing.navbar />
    @endauth
</header>
