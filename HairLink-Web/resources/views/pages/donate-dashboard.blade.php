@extends('layouts.dashboard')

@section('title', 'HairLink | Donate Hair')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/donate-dashboard.css') }}">
@endpush

@section('content')
    <section class="section-wrap donate-page reveal">
        <div class="section-title-block center">
            <h1>Donate Hair</h1>
            <p>Your donation helps create wigs for people with medical hair loss.</p>
        </div>

        <article class="guidelines-box">
            <h2><i class='bx bxs-ribbon'></i> Donation Guidelines</h2>
            <ul>
                <li>Hair must be at least 10 inches long.</li>
                <li>Hair should be tied, sealed, and placed in a labeled non-plastic container.</li>
                <li>Colored hair is accepted.</li>
                <li>Hair must be clean and untangled.</li>
            </ul>
        </article>

        <article class="form-shell">
            <form id="donationForm" novalidate>
                <div class="form-head">
                    <h2>Donation Details</h2>
                    <i class='bx bxs-heart-circle'></i>
                </div>

                <div class="form-grid two-col">
                    <label>
                        Full Name <span>*</span>
                        <input id="fullName" name="fullName" type="text"
                            value="{{ auth()->user()->first_name ? auth()->user()->first_name . ' ' . auth()->user()->last_name : auth()->user()->name }}"
                            readonly required style="background:#f5f3f7;cursor:not-allowed;">
                    </label>
                    <label>
                        Email <span>*</span>
                        <input id="email" name="email" type="email" value="{{ auth()->user()->email }}" readonly required
                            style="background:#f5f3f7;cursor:not-allowed;">
                    </label>
                    <label>
                        Phone Number <span>*</span>
                        <input id="phone" name="phone" type="tel" value="{{ auth()->user()->phone ?? '' }}" readonly
                            required style="background:#f5f3f7;cursor:not-allowed;">
                    </label>
                    <label>
                        Hair Length <span>*</span>
                        <select id="hairLength" name="hairLength" required>
                            <option value="" selected disabled>Select hair length</option>
                            <option>10 to 14 inches</option>
                            <option>15 to 20 inches</option>
                            <option>More than 20 inches</option>
                        </select>
                    </label>
                    <label>
                        Natural Hair Color <span>*</span>
                        <select id="hairColor" name="hairColor" required>
                            <option value="" selected disabled>Select hair color</option>
                            <option>Black</option>
                            <option>Brown</option>
                            <option>Light</option>
                            <option>Other</option>
                        </select>
                    </label>
                    <label class="checkbox-wrap">
                        <input id="treatedHair" type="checkbox">
                        <span>My hair has been chemically treated.</span>
                    </label>
                </div>

                <div class="form-grid two-col">
                    <label>
                        Shipping Address <span>*</span>
                        <textarea id="address" name="address" rows="4" required></textarea>
                    </label>
                    <label>
                        Why are you donating? <span>*</span>
                        <textarea id="reason" name="reason" rows="4" required></textarea>
                    </label>
                </div>

                <div class="upload-row">
                    <p>Upload a clear picture of the hair (max 10MB) <span>*</span></p>
                    <div class="upload-controls">
                        <input id="hairPhoto" name="hairPhoto" type="file" accept="image/*" hidden required>
                        <button id="uploadBtn" class="ghost-btn" type="button">Add File</button>
                        <small id="fileName">No file selected</small>
                    </div>
                </div>

                <div class="delivery-note">
                    <h3>Delivery Details</h3>
                    <p>Address: Manila Downtown YMCA, 945 Sabino Padilla St, Binondo, Manila</p>
                    <p>Receiving Time: Monday to Sunday, 9:00 AM to 7:00 PM</p>
                    <p>Contact: Venus May Alinsod | 0917-847-4270</p>
                </div>

                <div class="submit-wrap">
                    <button class="soft-btn" type="submit">Submit Donation</button>
                </div>
            </form>
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/donor-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/donate-dashboard.js') }}" defer></script>
@endpush