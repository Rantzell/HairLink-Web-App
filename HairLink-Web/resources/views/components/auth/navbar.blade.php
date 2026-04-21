<header class="auth-navbar">
    <nav class="auth-navbar-inner" aria-label="Auth navigation">
        <a class="auth-brand" href="{{ url('/') }}" aria-label="HairLink home">
            <img src="{{ asset('assets/images/landing/pink-ribbon.png') }}" alt="Pink ribbon icon">
            <span>HairLink</span>
        </a>

        <div class="auth-nav-links">
            <a href="{{ url('/') }}">Home</a>
            <a href="{{ route('login') }}" class="{{ request()->routeIs('login') ? 'active' : '' }}">Login</a>
            <a href="{{ route('register') }}" class="{{ request()->routeIs('register') ? 'active' : '' }}">Register</a>
        </div>
    </nav>
</header>