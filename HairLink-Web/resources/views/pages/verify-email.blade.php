@extends('layouts.auth')

@section('title', 'Verify Your Email')

@push('styles')
    <style>
        .verification-overlay {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            padding: 2rem;
            background: #fff0f5;
        }

        .verification-card {
            background-color: #fff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(184, 56, 112, 0.1);
            max-width: 500px;
            width: 100%;
            text-align: center;
            border: 1px solid #fce4ec;
        }

        .envelope-icon {
            font-size: 64px;
            color: #d81b60;
            margin-bottom: 20px;
        }

        .verification-card h1 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-family: 'Playfair Display', serif;
        }

        .verification-card p {
            color: #555;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }

        .form-control {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            text-align: center;
            letter-spacing: 2px;
        }

        .verify-btn {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
            width: 100%;
            transition: background 0.3s;
            margin-bottom: 15px;
        }

        .verify-btn:hover {
            background-color: #b0124a;
        }

        .resend-btn {
            background: none;
            border: none;
            color: #d81b60;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-decoration: underline;
        }

        .resend-btn:hover {
            color: #b0124a;
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
            color: #c0392b;
            background: #fadbd8;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }
    </style>
@endpush

@section('content')
<div class="verification-overlay">
    <div class="verification-card">
        <div class="envelope-icon">
            <i class='bx bx-envelope-open'></i>
        </div>
        <h1>Enter Verification Code</h1>
        
        @if (session('message'))
            <div class="success-msg">
                {{ session('message') }}
            </div>
        @endif

        @if (session('error'))
            <div class="error-msg">
                {{ session('error') }}
            </div>
        @endif

        @if ($errors->any())
            <div class="error-msg">
                {{ $errors->first() }}
            </div>
        @endif

        <p>We've sent a 6-digit One-Time Password (OTP) to your email address. Please enter it below.</p>

        <form method="POST" action="{{ route('verification.verify.otp') }}">
            @csrf
            <div class="form-group">
                <input type="text" name="otp" class="form-control" placeholder="123456" required maxlength="6" pattern="\d{6}">
            </div>
            <button type="submit" class="verify-btn">Verify Email</button>
        </form>

        <form method="POST" action="{{ route('verification.send') }}" style="margin-top: 20px;">
            @csrf
            <p style="margin-bottom: 5px;">Didn't receive the email?</p>
            <button type="submit" class="resend-btn">Resend OTP</button>
        </form>
    </div>
</div>
@endsection
