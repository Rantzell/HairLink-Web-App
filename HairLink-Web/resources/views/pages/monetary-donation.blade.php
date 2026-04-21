@extends('layouts.dashboard')

@section('title', 'HairLink | Monetary Donation')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/recipient-module.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/monetary-donation.css') }}">
@endpush

@section('content')
    <div class="section-wrap monetary-page">
        <div class="section-title-block center">
            <h1>Monetary Donation</h1>
            <p>Your financial support helps HairLink continue providing wigs and care to those in need.</p>
        </div>

        <!-- Guidelines -->
        <div class="request-guidelines">
            <div class="guidelines-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z">
                    </path>
                </svg>
                <h3>Donation Guidelines</h3>
            </div>
            <div class="guidelines-grid">
                <div class="guideline-col">
                    <div class="guideline-group">
                        <h4>Prepare the following:</h4>
                        <ul>
                            <li>Your proof of donation (screenshot or receipt)</li>
                            <li>Valid name matching your bank account</li>
                            <li>Exact donation amount</li>
                        </ul>
                    </div>
                </div>
                <div class="guideline-col">
                    <div class="guideline-group">
                        <h4>Important:</h4>
                        <ul>
                            <li>Transfer funds before completing this form</li>
                            <li>Upload clear proof of your transaction</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <form id="monetary-form" class="request-form" novalidate>

            <!-- Donation Details Section -->
            <div class="form-section">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="section-icon">
                        <path
                            d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                    </svg>
                    <h3>Donation Details</h3>
                </div>
                <button type="button" class="demo-fill-btn" id="fillMonetaryDemo" style="margin-top: 0;">Quick Fill Demo</button>
            </div>

                <div class="form-group">
                    <label>Select an amount</label>
                    <div class="amount-pills">
                        <button type="button" class="pill-btn" data-amount="50">&#8369; 50</button>
                        <button type="button" class="pill-btn" data-amount="100">&#8369; 100</button>
                        <button type="button" class="pill-btn" data-amount="150">&#8369; 150</button>
                        <button type="button" class="pill-btn" data-amount="200">&#8369; 200</button>
                        <button type="button" class="pill-btn" data-amount="250">&#8369; 250</button>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="custom-amount">Or Enter A Custom Amount</label>
                        <input type="number" id="custom-amount" name="customAmount" placeholder="" min="1">
                    </div>
                    <div class="form-group">
                        <label for="currency">Currency <span class="required">*</span></label>
                        <select id="currency" name="currency" required>
                            <option value="PHP">&#8369;</option>
                            <option value="USD">$</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Billing Information Section -->
            <div class="form-section">
                <div class="section-header billing-section-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="section-icon">
                        <path
                            d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                    <h3>Billing Information</h3>
                    <div class="payment-tabs">
                        <button type="button" class="tab-btn active" data-tab="bank">Bank Transfer</button>
                        <button type="button" class="tab-btn" data-tab="instapay">InstaPay</button>
                    </div>
                </div>

                <div class="billing-body">
                    <!-- Bank Transfer Card -->
                    <div class="bank-card" id="bank-card-bank">
                        <div class="bank-logo">BDO</div>
                        <div class="bank-info">
                            <p class="account-name">Venus Alinsod</p>
                            <p class="account-number">004560025684</p>
                        </div>
                    </div>
                    <!-- InstaPay Card -->
                    <div class="bank-card instapay-card hidden" id="bank-card-instapay">
                        <div class="bank-logo instapay-logo">IP</div>
                        <div class="bank-info">
                            <p class="account-name">Venus Alinsod</p>
                            <p class="account-number">0917-847-4270</p>
                        </div>
                    </div>

                    <div class="billing-fields">
                        <div class="form-group">
                            <label for="billing-name">Full Name <span class="required">*</span></label>
                            <p class="help-text">Full Name matched from your profile</p>
                            <input type="text" id="billing-name" name="billingName"
                                value="{{ auth()->user()->first_name ? auth()->user()->first_name . ' ' . auth()->user()->last_name : auth()->user()->name }}"
                                readonly required style="background:#f5f3f7;cursor:not-allowed;">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="amount-number">Amount of Donation (in number) <span
                                        class="required">*</span></label>
                                <input type="text" id="amount-number" name="amountNumber" placeholder="Ex. 10,000.00"
                                    required>
                            </div>
                            <div class="form-group">
                                <label for="amount-words">Amount of Donation (in words) <span
                                        class="required">*</span></label>
                                <input type="text" id="amount-words" name="amountWords" placeholder="Ex. Ten thousand pesos"
                                    required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="proof-donation">Proof of Donation <span class="required">*</span></label>
                            <p class="help-text">Kindly insert the screenshot/photo or any proof of donation</p>
                            <p class="help-text">Upload 1 supported file: PDF, document, or image. Max 10 MB</p>
                            <div class="file-upload">
                                <input type="file" id="proof-donation" name="proofDonation"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required>
                                <label for="proof-donation" class="file-label">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        stroke-width="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    Add File
                                </label>
                                <div id="proof-file-list" class="file-list"></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="anonymous" name="anonymous">
                                <span>Make this donation anonymous</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions monetary-actions">
                <button type="submit" class="donate-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Donate it
                </button>
                @if(isset($userRole) && $userRole === 'recipient')
                    <a href="{{ route('recipient.dashboard') }}" class="ghost-btn">Cancel</a>
                @else
                    <a href="{{ route('donor.dashboard') }}" class="ghost-btn">Cancel</a>
                @endif
            </div>
        </form>
    </div>

    <script src="{{ asset('assets/js/monetary-donation.js') }}"></script>
@endsection