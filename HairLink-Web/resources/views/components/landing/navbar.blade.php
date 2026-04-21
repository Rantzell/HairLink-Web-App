<nav class="navbar" aria-label="Primary">
    <a class="brand" href="#top" aria-label="HairLink home">
        <img src="{{ asset('assets/images/landing/pink-ribbon.png') }}" alt="Pink ribbon icon" class="brand-ribbon">
        <span>HairLink</span>
    </a>

    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="siteMenu" id="menuToggle" aria-label="Toggle navigation menu">
        <span class="menu-toggle-icon" aria-hidden="true">
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
            <span class="menu-toggle-bar"></span>
        </span>
    </button>

    <div class="menu" id="siteMenu">
        <a href="#hero">Home</a>
        <a href="#services">How It Works</a>
        <a href="#about">About</a>
        <a href="#partners">Partnership</a>
        <a href="#contact">Contact</a>
    </div>

    <div class="auth-actions">
        @auth
            <a class="btn btn-primary" href="{{ route('dashboard') }}">My Dashboard</a>
        @else
            @if (Route::has('login'))
                <a class="btn btn-outline" href="{{ route('login') }}">Login</a>
            @endif
            @if (Route::has('register'))
                <a class="btn btn-primary" href="{{ route('register') }}">Register</a>
            @endif
        @endauth
    </div>
</nav>
