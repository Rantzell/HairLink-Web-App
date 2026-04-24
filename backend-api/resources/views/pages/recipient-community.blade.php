@extends('layouts.dashboard')

@section('title', 'Community Support | HairLink Recipients')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/community.css') }}">
@endpush

@section('content')
    <section class="section-wrap">
        <div class="section-title-block">
            <h1>Community Support</h1>
            <p>Connect with others, share your journey, and receive support from our caring community.</p>
        </div>

        <!-- Create Post Form -->
        <div class="create-post-box">
            <div class="post-form-header">
                <h3>Share Your Journey</h3>
                <p>Share your story, ask for advice, or offer support to fellow community members.</p>
            </div>
            <form id="create-post-form" class="post-form">
                <textarea name="content" placeholder="What's on your mind? Share your journey, ask for support, or encourage others..." rows="4" required></textarea>
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
            <a href="{{ route('recipient.dashboard') }}" class="soft-btn">Back to Dashboard</a>
        </div>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/community-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/community-recipient.js') }}" defer></script>
@endpush
