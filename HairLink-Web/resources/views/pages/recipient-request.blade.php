@extends('layouts.dashboard')

@section('title', 'Request Hair')

@section('content')
    <div class="section-wrap recipient-request-page">
        <div class="section-title-block center">
            <h1>Request Hair</h1>
            <p>Let's boost your confidence. Request hair to support your journey of comfort and self-expression.</p>
        </div>

        <!-- Guidelines -->
        <div class="request-guidelines">
            <div class="guidelines-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z">
                    </path>
                </svg>
                <h3>Request Guidelines</h3>
            </div>
            <div class="guidelines-grid">
                <div class="guideline-col">
                    <div class="guideline-group">
                        <h4>Prepare the following:</h4>
                        <ul>
                            <li>Your story/journey</li>
                            <li>Related documents</li>
                            <li>Any photo of yourself</li>
                        </ul>
                    </div>
                </div>
                <div class="guideline-col">
                    <div class="guideline-group">
                        <h4>Important:</h4>
                        <ul>
                            <li>Wait for us to message you directly to coordinate other important details</li>
                            <li>Fill up the wig request form</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Request Form -->
        <form id="request-form" class="request-form">
            <!-- Request Details Section -->
            <div class="form-section">
                <div class="section-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="section-icon">
                        <path
                            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z">
                        </path>
                    </svg>
                    <h3>Request Details</h3>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="full-name">Full Name <span class="required">*</span></label>
                        <input type="text" id="full-name" name="fullName"
                            value="{{ auth()->user()->first_name ? auth()->user()->first_name . ' ' . auth()->user()->last_name : auth()->user()->name }}"
                            readonly required style="background:#f5f3f7;cursor:not-allowed;">
                    </div>
                    <div class="form-group">
                        <label for="contact-number">Contact Number <span class="required">*</span></label>
                        <input type="tel" id="contact-number" name="contactNumber" value="{{ auth()->user()->phone ?? '' }}"
                            readonly required style="background:#f5f3f7;cursor:not-allowed;">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="gender">Gender <span class="required">*</span></label>
                        <select id="gender" name="gender" required
                            style="background:#f5f3f7;cursor:not-allowed;pointer-events:none;">
                            <option value="">Select Gender</option>
                            <option value="male" @selected(in_array(trim(strtolower(auth()->user()->gender)), ['male', 'm']))>Male</option>
                            <option value="female" @selected(in_array(trim(strtolower(auth()->user()->gender)), ['female', 'f']))>Female</option>
                            <option value="nonbinary" @selected(in_array(trim(strtolower(auth()->user()->gender)), ['nonbinary', 'non-binary', 'other']))>Non-binary</option>
                            <option value="prefer_not_say" @selected(in_array(trim(strtolower(auth()->user()->gender)), ['prefer_not_say', 'prefer-not-to-say', 'prefer not to say']))>Prefer not to say</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address <span class="required">*</span></label>
                        <input type="email" id="email" name="email" value="{{ auth()->user()->email }}" readonly required
                            style="background:#f5f3f7;cursor:not-allowed;">
                    </div>
                </div>
            </div>

            <!-- Your Journey Section -->
            <div class="form-section">
                <div class="section-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="section-icon">
                        <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4-2h2v20h-2zm4 4h2v16h-2zm4 8h2v8h-2z" opacity="0.3">
                        </path>
                        <path d="M19 3h-1V1h-2v2h-4V1h-2v2H5V1H3v2H2v14h20V3h-1zm0 12H4V8h15z"></path>
                    </svg>
                    <h3>Your Journey</h3>
                </div>

                <div class="form-group">
                    <label for="story">Please share with us your story/journey <span class="required">*</span></label>
                    <p class="help-text">You may include the following information as your description:</p>
                    <ul class="help-list">
                        <li>Cause of Hair Loss</li>
                        <li>Duration of Hair Loss</li>
                        <li>Name of Attending Physician or Medical Institute (optional but adds validity)</li>
                        <li>What has been the most challenging part of your experience</li>
                        <li>What gives you hope and keeps you going?</li>
                    </ul>
                    <textarea id="story" name="story" placeholder="Tell us your story..." required></textarea>
                </div>

                <div class="form-group">
                    <label for="documents">Upload supporting document/s here <span class="required">*</span></label>
                    <p class="help-text">E.g. picture of medical certificate, doctor's diagnosis, or any proof that verifies
                        the donee as a patient</p>
                    <div class="file-upload">
                        <input type="file" id="documents" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            required>
                        <label for="documents" class="file-label">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Add File
                        </label>
                        <div id="file-list" class="file-list"></div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="additional-photo">Additional Picture for reference <span class="required">*</span></label>
                    <p class="help-text">You may upload photos of the patient to help us gain a clearer understanding of
                        their condition.</p>
                    <div class="file-upload">
                        <input type="file" id="additional-photo" name="additionalPhoto" accept=".jpg,.jpeg,.png,.gif,.webp"
                            required>
                        <label for="additional-photo" class="file-label">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Add File
                        </label>
                        <div id="photo-display" class="file-list"></div>
                    </div>
                </div>
            </div>

            <!-- Wig Preferences Section -->
            <div class="form-section">
                <div class="section-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="section-icon">
                        <path
                            d="M12 2C8.13 2 5 5.13 5 9c0 2.76 1.57 5.15 3.87 6.4L8 20h8l-.87-4.6C17.43 14.15 19 11.76 19 9c0-3.87-3.13-7-7-7zm-1 14h2v2h-2zm0-3h2v1h-2zm1-9c2.21 0 4 1.79 4 4 0 1.61-.96 3.01-2.35 3.65L13 13h-2l-.65-2.35C8.96 10.01 8 8.61 8 7c0-2.21 1.79-4 4-4z" />
                    </svg>
                    <h3>Wig Preferences</h3>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="wig-length">Preferred Wig Length <span class="required">*</span></label>
                        <select id="wig-length" name="wigLength" required>
                            <option value="">Select Wig Length</option>
                            <option value="short">Short</option>
                            <option value="medium">Medium</option>
                            <option value="long">Long</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="wig-color">Preferred Hair Color <span class="required">*</span></label>
                        <select id="wig-color" name="wigColor" required>
                            <option value="">Select Hair Color</option>
                            <option value="black">Black</option>
                            <option value="dark-brown">Dark Brown</option>
                            <option value="light-brown">Light Brown</option>
                            <option value="blonde">Blonde</option>
                            <option value="auburn">Auburn / Red</option>
                            <option value="gray">Gray / White</option>
                            <option value="no-preference">No Preference</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
                <button type="submit" class="soft-btn">Submit Request</button>
                <a href="{{ route('recipient.dashboard') }}" class="ghost-btn">Cancel</a>
            </div>
        </form>
    </div>

@endsection

@push('scripts')
    <script src="{{ asset('assets/js/recipient-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/recipient-request.js') }}" defer></script>
@endpush