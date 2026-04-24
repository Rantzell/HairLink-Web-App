@php
    $initialMode = $initialMode ?? 'register';
@endphp

<style>
    .input-wrapper {
        width: 100%;
        margin-bottom: 12px;
        position: relative;
    }

    .ajax-error {
        display: none;
        color: #e74c3c;
        font-size: 11px;
        text-align: left;
        margin-top: 4px;
        line-height: 1.2;
        width: 100%;
        padding-left: 20px;
    }

    .phone-prefix-box {
        display: flex;
        align-items: center;
        width: 100%;
        border: 1px solid #e8d8e8;
        border-radius: 8px;
        background: #fff;
        margin: 0.6rem 0;
        padding-left: 0.58rem;
        transition: border-color 160ms ease, box-shadow 160ms ease;
        position: relative;
    }

    .phone-prefix-box:focus-within {
        border-color: #d574aa;
        box-shadow: 0 0 0 3px rgba(213, 116, 170, 0.15);
    }

    .phone-prefix {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #9f8ba8;
        /* Matches the color of other icons in the form */
        white-space: nowrap;
        flex-shrink: 0;
        margin-right: 5px;
        line-height: 1;
    }

    .phone-prefix .flag {
        font-size: 14px;
        display: inline-flex;
        align-items: center;
    }

    .phone-prefix-box .inner-input-wrapper {
        flex: 1;
        position: relative;
    }

    .phone-prefix-box input {
        width: 100%;
        border: none !important;
        background: transparent !important;
        padding: 0.42rem 1.75rem 0.42rem 0 !important;
        outline: none !important;
        font: inherit;
        color: var(--ink);
    }

    .phone-prefix-box i {
        position: absolute;
        right: 0.7rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9f8ba8;
        font-size: 0.9rem;
    }

    .password-toggle {
        right: 0.7rem !important;
        cursor: pointer;
        transition: color 160ms ease;
        z-index: 10;
    }

    .password-toggle:hover {
        color: #d574aa !important;
    }

    .input-box .lock-icon {
        right: 2.2rem !important;
    }
</style>

<div id="fullScreenLoader"
    style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); z-index: 9999; justify-content: center; align-items: center; flex-direction: column;">
    <div
        style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #ff6b81; border-radius: 50%; animation: spin 1s linear infinite;">
    </div>
    <h2 style="margin-top: 15px; color: #333; font-family: 'Manrope', sans-serif;" id="loaderText">Processing...</h2>
    <style>
        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }
    </style>
</div>

<div class="container {{ $initialMode === 'register' ? 'active' : '' }}" id="authContainer"
    data-initial-mode="{{ $initialMode }}">
    <div class="form-box login">
        <form id="loginForm" action="{{ route('login.post') }}" method="POST">
            @csrf
            <h1>Login</h1>
            <p class="form-subtitle">We've missed you. Log in to continue your HairLink journey.</p>
            <div class="demo-account-card">
                <p class="demo-account-title">Admin demo account</p>
                <p class="demo-account-copy">Use this for frontend preview only.</p>
                <p class="demo-account-credentials">Email: admin@hairlink.local</p>
                <p class="demo-account-credentials">Password: admin12345</p>
                <button type="button" class="demo-fill-btn" id="fillAdminDemo">Use Admin Demo</button>
                <div class="demo-switch-row">
                    <button type="button" class="demo-fill-btn" id="fillDonorDemo">Open Donor Demo</button>
                    <button type="button" class="demo-fill-btn" id="fillRecipientDemo">Open Recipient Demo</button>
                </div>
                <div class="demo-switch-row">
                    <button type="button" class="demo-fill-btn" id="fillStaffDemo">Open Staff Demo</button>
                    <button type="button" class="demo-fill-btn" id="fillWigmakerDemo">Open Wigmaker Demo</button>
                </div>
            </div>

            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 0;">
                    <input id="loginEmail" name="email" type="email" placeholder="Email" required>
                    <i class='bx bxs-envelope'></i>
                </div>
                <div class="ajax-error" id="error-login-email"></div>
            </div>

            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 0;">
                    <input id="loginPassword" name="password" type="password" placeholder="Password" required>
                    <i class='bx bxs-lock-alt lock-icon'></i>
                    <i class='bx bx-show password-toggle'></i>
                </div>
                <div class="ajax-error" id="error-login-password"></div>
            </div>

            <div class="forgot-link">
                <a href="{{ route('password.request') }}">Forgot Password?</a>
            </div>

            <button type="submit" class="btn">Login</button>
        </form>
    </div>

    <div class="form-box register">
        <form id="registerForm" action="{{ route('register.post') }}" method="POST">
            @csrf
            <h1>Create Your Account</h1>
            <p class="form-subtitle">Sign up as a donor or recipient to join the mission.</p>

            <div class="user-type-group">
                <span class="user-type-label">User Type</span>
                <div class="user-type-options">
                    <label class="user-type-option">
                        <input type="radio" name="userType" value="donor" required>
                        <span>Donor</span>
                    </label>

                    <label class="user-type-option">
                        <input type="radio" name="userType" value="recipient" required>
                        <span>Recipient</span>
                    </label>
                </div>
                <div class="ajax-error" id="error-register-userType" style="padding-left: 0;"></div>
            </div>

            <div class="grid-two-cols">
                <div class="input-wrapper">
                    <div class="input-box input-box--medium" style="margin-bottom: 0;">
                        <input type="text" name="first_name" placeholder="First Name" required>
                        <i class='bx bxs-user'></i>
                    </div>
                    <div class="ajax-error" id="error-register-first_name"></div>
                </div>

                <div class="input-wrapper">
                    <div class="input-box input-box--medium" style="margin-bottom: 0;">
                        <input type="text" name="last_name" placeholder="Last Name" required>
                        <i class='bx bxs-user'></i>
                    </div>
                    <div class="ajax-error" id="error-register-last_name"></div>
                </div>
            </div>

            <div class="grid-two-cols">
                <div class="input-wrapper">
                    <div class="input-box select-wrapper" style="margin-bottom: 0;">
                        <input type="hidden" name="country" value="ph">
                        <select disabled
                            style="background:#f5f3f7; cursor:not-allowed; -webkit-appearance:none; -moz-appearance:none; appearance:none;">
                            <option value="ph" selected>Philippines</option>
                        </select>
                        <i class='bx bx-world'></i>
                    </div>
                    <div class="ajax-error" id="error-register-country"></div>
                </div>

                <div class="input-wrapper">
                    <div class="input-box" style="margin-bottom: 0;">
                        <input type="text" name="region" placeholder="Region / Province" required>
                        <i class='bx bxs-map'></i>
                    </div>
                    <div class="ajax-error" id="error-register-region"></div>
                </div>
            </div>

            <div class="grid-two-cols">
                <div class="input-wrapper">
                    <div class="input-box input-box--short" style="margin-bottom: 0;">
                        <input type="text" name="postal_code" placeholder="Postal Code" required>
                        <i class='bx bxs-home'></i>
                    </div>
                    <div class="ajax-error" id="error-register-postal_code"></div>
                </div>

                <div class="input-wrapper">
                    <div class="input-box input-box--short" style="margin-bottom: 0;">
                        <input type="number" name="age" min="1" max="120" placeholder="Age" required>
                        <i class='bx bx-calendar'></i>
                    </div>
                    <div class="ajax-error" id="error-register-age"></div>
                </div>
            </div>

            <div class="grid-two-cols">
                <div class="input-wrapper">
                    <div class="input-box select-wrapper input-box--medium" style="margin-bottom: 0;">
                        <select name="gender" required>
                            <option value="" disabled selected>Gender</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="nonbinary">Non-binary</option>
                            <option value="prefer_not_say">Prefer not to say</option>
                        </select>
                        <i class='bx bx-user-circle'></i>
                    </div>
                    <div class="ajax-error" id="error-register-gender"></div>
                </div>

                <div class="input-wrapper">
                    <div class="phone-prefix-box">
                        <div class="phone-prefix">
                            <span class="flag">🇵🇭</span>
                            <span>+63</span>
                        </div>
                        <div class="inner-input-wrapper">
                            <input type="tel" id="phoneDisplay" placeholder="9171234567" maxlength="10" required>
                            <i class='bx bxs-phone'></i>
                        </div>
                    </div>
                    <input type="hidden" name="phone" id="phoneHidden">
                    <div class="ajax-error" id="error-register-phone"></div>
                </div>
            </div>

            <div class="input-wrapper">
                <div class="input-box input-box--long" style="margin-bottom: 0;">
                    <input id="registerEmail" type="email" name="email" placeholder="Email Address" autocomplete="email"
                        inputmode="email" required>
                    <i class='bx bxs-envelope'></i>
                </div>
                <div class="ajax-error" id="error-register-email"></div>
            </div>

            <div class="grid-two-cols">
                <div class="input-wrapper">
                    <div class="input-box input-box--medium" style="margin-bottom: 0;">
                        <input id="registerPassword" name="password" type="password" placeholder="Password" required>
                        <i class='bx bxs-lock-alt lock-icon'></i>
                        <i class='bx bx-show password-toggle'></i>
                    </div>
                    <div class="ajax-error" id="error-register-password"></div>
                </div>

                <div class="input-wrapper">
                    <div class="input-box input-box--medium" style="margin-bottom: 0;">
                        <input id="registerConfirmPassword" name="password_confirmation" type="password"
                            placeholder="Confirm Password" required>
                        <i class='bx bxs-lock-alt lock-icon'></i>
                        <i class='bx bx-show password-toggle'></i>
                    </div>
                    <div class="ajax-error" id="error-register-password_confirmation"></div>
                </div>
            </div>

            <button type="submit" class="btn">Create Account</button>
        </form>
    </div>

    <div class="toggle-box">
        <div class="toggle-panel toggle-left">
            <h2>Welcome Back!</h2>
            <p>Already part of Strand Up for Cancer?</p>
            <button type="button" class="btn login-btn">Go to Login</button>
        </div>

        <div class="toggle-panel toggle-right">
            <h2>Hello, Welcome!</h2>
            <p>Don't have an account yet?</p>
            <button type="button" class="btn register-btn">Go to Register</button>
        </div>
    </div>
</div>