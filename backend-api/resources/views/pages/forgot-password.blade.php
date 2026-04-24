@extends('layouts.auth')

@section('title', 'HairLink | Forgot Password')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/auth-base.css') }}">
    <style>
        .forgot-password-card {
            background-color: #fff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(184, 56, 112, 0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
            border: 1px solid #fce4ec;
        }

        .forgot-icon {
            font-size: 64px;
            color: #d81b60;
            margin-bottom: 20px;
        }

        .forgot-password-card h1 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-family: 'Playfair Display', serif;
        }

        .forgot-password-card p {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        .success-msg {
            color: #27ae60;
            background: #e8f8f5;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .error-msg {
            color: #e74c3c;
            font-size: 13px;
            text-align: left;
            margin-top: 5px;
            padding-left: 5px;
        }
        
        .input-box { margin-bottom: 20px;}
        
        .back-link {
            display: inline-block;
            margin-top: 20px;
            color: #9f8ba8;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
        }
        .back-link:hover { color: #d81b60; }
    </style>
@endpush

@section('content')
<main class="auth-shell">
    <div class="forgot-password-card">
        <div class="forgot-icon">
            <i class='bx bx-lock-open-alt'></i>
        </div>
        <h1>Forgot Password</h1>
        
        @if (session('success'))
            <div class="success-msg">
                {{ session('success') }}
            </div>
        @endif

        <p>Enter your email address and we will send you a link to reset your password.</p>

        <form method="POST" action="{{ route('password.email') }}" id="forgotPasswordForm">
            @csrf
            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 5px;">
                    <input id="email" name="email" type="email" placeholder="Email Address" value="{{ old('email') }}" required autofocus>
                    <i class='bx bxs-envelope'></i>
                </div>
                @error('email')
                    <div class="error-msg">{{ $message }}</div>
                @enderror
            </div>

            <button type="submit" class="btn" id="submitBtn" style="margin-top: 20px;">Send Reset Link</button>
        </form>
        
        <script>
            document.getElementById('forgotPasswordForm').addEventListener('submit', function() {
                var btn = document.getElementById('submitBtn');
                btn.innerHTML = 'Sending...';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            });
        </script>
        
        <a href="{{ route('login') }}" class="back-link">Back to Login</a>
    </div>
</main>
@endsection
