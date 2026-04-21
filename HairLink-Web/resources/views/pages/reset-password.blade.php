@extends('layouts.auth')

@section('title', 'HairLink | Reset Password')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/auth-base.css') }}">
    <style>
        .reset-password-card {
            background-color: #fff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(184, 56, 112, 0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
            border: 1px solid #fce4ec;
        }

        .reset-icon {
            font-size: 64px;
            color: #d81b60;
            margin-bottom: 20px;
        }

        .reset-password-card h1 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-family: 'Playfair Display', serif;
        }

        .reset-password-card p {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        .error-msg {
            color: #e74c3c;
            font-size: 13px;
            text-align: left;
            margin-top: 5px;
            padding-left: 5px;
            margin-bottom: 15px;
        }
        
    </style>
@endpush

@section('content')
<main class="auth-shell">
    <div class="reset-password-card">
        <div class="reset-icon">
            <i class='bx bx-key'></i>
        </div>
        <h1>Reset Password</h1>
        
        <p>Please enter your new password below.</p>

        <form method="POST" action="{{ route('password.update') }}">
            @csrf
            
            <input type="hidden" name="token" value="{{ $token }}">

            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 5px;">
                    <input id="email" name="email" type="email" placeholder="Email Address" value="{{ $email ?? old('email') }}" required readonly>
                    <i class='bx bxs-envelope'></i>
                </div>
                @error('email')
                    <div class="error-msg">{{ $message }}</div>
                @enderror
            </div>
            
            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 5px;">
                    <input id="password" name="password" type="password" placeholder="New Password" required autofocus>
                    <i class='bx bxs-lock-alt'></i>
                </div>
                @error('password')
                    <div class="error-msg">{{ $message }}</div>
                @enderror
            </div>
            
            <div class="input-wrapper">
                <div class="input-box" style="margin-bottom: 5px;">
                    <input id="password_confirmation" name="password_confirmation" type="password" placeholder="Confirm New Password" required>
                    <i class='bx bxs-lock-alt'></i>
                </div>
            </div>

            <button type="submit" class="btn" style="margin-top: 20px;">Reset Password</button>
        </form>
    </div>
</main>
@endsection
