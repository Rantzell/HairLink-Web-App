import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import apiClient from '../api/client';
import '../styles/VerifyOtp.css';

const dashboardPath: Record<string, string> = {
  admin:     '/admin/dashboard',
  staff:     '/staff/dashboard',
  wigmaker:  '/wigmaker/dashboard',
  recipient: '/recipient/dashboard',
  donor:     '/donor/dashboard',
};

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (verifyError) throw verifyError;
      await apiClient.post('/auth/mark-verified');
      const profile = await apiClient.get('/auth/me');
      const role = profile.data?.role || 'donor';
      navigate(dashboardPath[role] || '/donor/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email });
      if (otpError) throw otpError;
      setResendMsg('A new code has been sent to your email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="verify-otp-container">
      <div className="verify-otp-card">
        {/* Icon */}
        <div className="verify-otp-icon">
          ✉️
        </div>

        <h1 className="verify-otp-title">
          Check your email
        </h1>
        <p className="verify-otp-text-muted">
          A verification code has been sent to:
        </p>
        <p className="verify-otp-email">
          {email}
        </p>
        <p className="verify-otp-helper-text">
          This is required once to verify your account. The code expires in 1 hour.
        </p>

        <form onSubmit={handleVerify}>
          {/* 6-digit OTP input */}
          <div className="verify-otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-digit-${i}`}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`verify-otp-input ${digit ? 'filled' : ''}`}
              />
            ))}
          </div>

          {error && (
            <p className="verify-otp-error">
              {error}
            </p>
          )}

          {resendMsg && (
            <p className="verify-otp-success">
              {resendMsg}
            </p>
          )}

          <button
            type="submit"
            id="verify-otp-btn"
            className="verify-otp-button"
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        <div className="verify-otp-resend-wrapper">
          <span className="verify-otp-resend-label">Didn't receive the code? </span>
          {countdown > 0 ? (
            <span className="verify-otp-countdown">Resend in {countdown}s</span>
          ) : (
            <button
              id="resend-otp-btn"
              onClick={handleResend}
              disabled={resending}
              className="verify-otp-resend-btn"
            >
              {resending ? 'Sending…' : 'Resend Code'}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="verify-otp-back-btn"
        >
          ← Back to Login
        </button>
      </div>
    </main>
  );
};

export default VerifyOtp;
