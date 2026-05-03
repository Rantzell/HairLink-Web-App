import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import apiClient from '../api/client';

const dashboardPath: Record<string, string> = {
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  wigmaker: '/wigmaker/dashboard',
  recipient: '/recipient/dashboard',
  donor: '/donor/dashboard',
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

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
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
    if (token.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: _verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;

      // Mark as verified in public.users via backend
      await apiClient.post('/auth/mark-verified');

      // Get profile to determine role
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
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #fdf0f5 0%, #f8e8ef 50%, #fce4ec 100%)',
      fontFamily: "'Manrope', 'Inter', sans-serif",
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(214, 51, 108, 0.12)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '440px',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b9d, #d6336c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '32px',
        }}>
          ✉️
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
          Check your email
        </h1>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
          A verification code has been sent to:
        </p>
        <p style={{ color: '#d6336c', fontWeight: 600, fontSize: '15px', marginBottom: '32px' }}>
          {email}
        </p>
        <p style={{ color: '#888', fontSize: '13px', marginBottom: '28px' }}>
          This is required once to verify your account. The code expires in 1 hour.
        </p>

        <form onSubmit={handleVerify}>
          {/* 6-digit OTP input */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}
               onPaste={handlePaste}>
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
                style={{
                  width: '52px',
                  height: '60px',
                  fontSize: '24px',
                  fontWeight: 700,
                  textAlign: 'center',
                  border: `2px solid ${digit ? '#d6336c' : '#e0e0e0'}`,
                  borderRadius: '12px',
                  outline: 'none',
                  color: '#1a1a2e',
                  background: digit ? '#fdf0f5' : '#fafafa',
                  transition: 'all 0.2s',
                  cursor: 'text',
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '16px', background: '#fff5f5', padding: '10px 16px', borderRadius: '8px', border: '1px solid #fed7d7' }}>
              {error}
            </p>
          )}
          {resendMsg && (
            <p style={{ color: '#2f855a', fontSize: '13px', marginBottom: '16px', background: '#f0fff4', padding: '10px 16px', borderRadius: '8px', border: '1px solid #c6f6d5' }}>
              {resendMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            id="verify-otp-btn"
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #ff6b9d, #d6336c)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        <div style={{ marginTop: '4px' }}>
          <span style={{ color: '#888', fontSize: '13px' }}>Didn't receive the code? </span>
          {countdown > 0 ? (
            <span style={{ color: '#aaa', fontSize: '13px' }}>Resend in {countdown}s</span>
          ) : (
            <button
              id="resend-otp-btn"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none', border: 'none',
                color: '#d6336c', fontWeight: 600, fontSize: '13px',
                cursor: resending ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {resending ? 'Sending…' : 'Resend OTP'}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: '20px', background: 'none', border: 'none',
            color: '#aaa', fontSize: '12px', cursor: 'pointer',
          }}
        >
          ← Back to Login
        </button>
      </div>
    </main>
  );
};

export default VerifyOtp;
