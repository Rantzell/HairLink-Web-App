@extends('layouts.dashboard')

@section('title', 'Community Support | HairLink Donors')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/community.css') }}">
@endpush

@section('content')
    <section class="section-wrap">
        <div class="section-title-block">
            <h1>Community Support</h1>
            <p>Connect, share, and support fellow donors and recipients in our community.</p>
        </div>

        <!-- Create Post Form -->
        <div class="create-post-box">
            <div class="post-form-header">
                <h3>Share Your Story</h3>
                <p>Tell others about your donation experience or offer support to community members.</p>
            </div>
            <form id="create-post-form" class="post-form">
                <textarea name="content" placeholder="What's on your mind? Share your experience, tips, or words of encouragement..." rows="4" required></textarea>
                <div class="form-actions">
                    <button type="submit" class="soft-btn">Post</button>
                </div>
            </form>
        </div>

        <!-- Posts Feed -->
        <div class="community-feed">
            <h2>Community Feed</h2>
            <div id="posts-feed" class="posts-feed">
                <!-- Posts will be rendered here -->
            </div>
        </div>

        <div class="community-cta">
            <a href="{{ route('donor.dashboard') }}" class="soft-btn">Back to Dashboard</a>
        </div>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/community-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/community-donor.js') }}" defer></script>
@endpush
