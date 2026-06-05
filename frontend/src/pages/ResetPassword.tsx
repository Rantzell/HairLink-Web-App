import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase writes the session from the URL hash automatically on PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setStatus('loading'); setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setStatus('error'); }
    else { setStatus('done'); }
  };

  if (status === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', maxWidth: '420px', width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fdf4', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
            <i className="bx bx-check-circle" style={{ fontSize: '2rem', color: '#10b981' }}></i>
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a' }}>Password Updated!</h1>
          <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>Your password has been reset. You can now log in with your new password.</p>
          <button onClick={() => navigate('/login')}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <i className="bx bx-loader-alt" style={{ fontSize: '2rem', animation: 'spin 0.8s linear infinite', display: 'block', marginBottom: '0.75rem', color: '#D63B8A' }}></i>
          <p style={{ margin: 0 }}>Verifying your reset link…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', maxWidth: '420px', width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" style={{ height: '36px', marginBottom: '0.5rem' }} />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a' }}>Set New Password</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>Enter and confirm your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>New Password</label>
            <input type="password" required minLength={6} placeholder="At least 6 characters" value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Confirm Password</label>
            <input type="password" required placeholder="Re-enter your password" value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${error ? '#ef4444' : '#e5e7eb'}`, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444' }}>{error}</p>}
          <button type="submit" disabled={status === 'loading'}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
            {status === 'loading' ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
