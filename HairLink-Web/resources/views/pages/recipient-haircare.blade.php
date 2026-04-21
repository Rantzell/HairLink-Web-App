@extends('layouts.dashboard')

@section('title', 'Hair Care Guide | HairLink')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/haircare.css') }}">
@endpush

@section('content')
    <section class="section-wrap">
        <div class="section-title-block">
            <h1>Hair Care Hub</h1>
            <p>Learn how to care for your wig with expert articles and video tutorials from our community.</p>
        </div>

        <!-- Tabs Navigation -->
        <div class="tabs-navigation">
            <button class="tab-btn active" data-tab="articles">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                Articles
            </button>
            <button class="tab-btn" data-tab="videos">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
                Video Tutorials
            </button>
        </div>

        <!-- Articles Tab -->
        <div class="tab-content active" data-tab="articles">
            <div class="articles-header">
                <h2>Hair Care Articles</h2>
                <div class="category-filters">
                    <button class="filter-btn active" data-category="all">All Categories</button>
                    <button class="filter-btn" data-category="Care">Care</button>
                    <button class="filter-btn" data-category="Styling">Styling</button>
                    <button class="filter-btn" data-category="Storage">Storage</button>
                </div>
            </div>
            <div class="articles-grid" id="articles-list">
                <!-- Articles will be rendered here -->
            </div>
        </div>

        <!-- Videos Tab -->
        <div class="tab-content" data-tab="videos">
            <div class="videos-header">
                <h2>Video Tutorials</h2>
                <p>Watch step-by-step guides and get inspired by our video collection.</p>
            </div>
            <div class="videos-grid" id="videos-list">
                <!-- Videos will be rendered here -->
            </div>
        </div>

        <!-- Support Section -->
        <div class="support-section">
            <h3>Need More Help?</h3>
            <p>Can't find what you're looking for? Join our community forum to ask questions and connect with other members who can help.</p>
            <div class="support-buttons">
                <a href="{{ route('recipient.community') }}" class="soft-btn">Visit Community Forum</a>
                <a href="{{ route('recipient.dashboard') }}" class="ghost-btn">Back to Dashboard</a>
            </div>
        </div>
    </section>

    <!-- Article Modal -->
    <div id="article-modal" class="modal">
        <div class="modal-content" id="article-modal-content">
            <!-- Article content will be rendered here -->
        </div>
    </div>

    <!-- Video Modal -->
    <div id="video-modal" class="modal">
        <div class="modal-content-large" id="video-player">
            <!-- Video player will be rendered here -->
        </div>
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/haircare-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/haircare-handler.js') }}" defer></script>
@endpush
