import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';

const isDev = import.meta.env.DEV;

/* ═══════════════════════════════════════════════════════════════
   STYLES — classic sliding-overlay split-screen auth
═══════════════════════════════════════════════════════════════ */
const authStyles = `
.hl-auth-root * { box-sizing: border-box; }
.hl-auth-root a  { text-decoration: none; }

/* ── Page wrapper ── */
.hl-auth-root {
  flex: 1;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(20px,4vw,48px) 16px;
  background: #FAFAF9;
}

/* ═══════════════════════════════════════════════
   CARD — overflow:hidden is the magic
═══════════════════════════════════════════════ */
.hl-auth-main {
  position: relative;
  width: min(1060px, 96vw);
  min-height: 640px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.14), 0 4px 16px rgba(0,0,0,.06);
}

/* ═══════════════════════════════════════════════
   FORM PANELS (white side)
═══════════════════════════════════════════════ */
.hl-form-box {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  overflow-y: auto;
  background: #ffffff;
  padding: clamp(1.75rem,3.5vw,2.75rem) clamp(1.5rem,3.5vw,2.75rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.6s ease-in-out;
}

.hl-form-box::-webkit-scrollbar { width: 3px; }
.hl-form-box::-webkit-scrollbar-thumb { background: #E5E5E0; border-radius: 2px; }

/* Login panel — starts on the RIGHT */
.hl-login-box {
  right: 0;
  left: auto;
  z-index: 2;
}

/* Register panel — starts on the LEFT, hidden */
.hl-register-box {
  left: 0;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  justify-content: flex-start;
  padding-top: clamp(1.5rem,3vw,2.25rem);
}

/* ═══════════════════════════════════════════════
   DARK OVERLAY PANEL
═══════════════════════════════════════════════ */

/* The clipping wrapper — starts at LEFT covering 50% */
.hl-overlay-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  overflow: hidden;
  z-index: 100;
  transition: transform 0.6s ease-in-out;
}

/* The inner overlay div is 200% wide so it can hold TWO sub-panels.
   Only one sub-panel is visible inside the 50% clipping wrap at a time. */
.hl-overlay {
  position: relative;
  width: 200%;
  height: 100%;
  background: #1a1617;
  transition: transform 0.6s ease-in-out;
}

/* Decorative pink glows inside overlay */
.hl-overlay::before {
  content: '';
  position: absolute;
  top: -25%; right: -10%;
  width: 55%; padding-top: 55%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214,59,138,.22) 0%, transparent 65%);
  pointer-events: none;
}
.hl-overlay::after {
  content: '';
  position: absolute;
  bottom: -18%; left: 5%;
  width: 40%; padding-top: 40%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(214,59,138,.12) 0%, transparent 65%);
  pointer-events: none;
}

/* Each sub-panel takes 50% of the 200%-wide overlay = 25% of the container */
.hl-ov-panel {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 2rem;
  text-align: center;
  transition: transform 0.6s ease-in-out;
}

/* LEFT sub-panel — visible in DEFAULT (login) state */
.hl-ov-left  { left: 0; }

/* RIGHT sub-panel — visible in ACTIVE (register) state */
.hl-ov-right { right: 0; transform: translateX(0); }

/* ═══════════════════════════════════════════════
   ACTIVE STATE TRANSITIONS
   Triggered by adding .active to .hl-auth-main
═══════════════════════════════════════════════ */

/* Login slides off to the right */
.hl-auth-main.active .hl-login-box {
  transform: translateX(100%);
}

/* Register panel reveals */
.hl-auth-main.active .hl-register-box {
  opacity: 1;
  z-index: 5;
  pointer-events: auto;
  animation: showRegister 0.6s ease-in-out;
}

@keyframes showRegister {
  0%,   49.9% { opacity: 0; z-index: 1; }
  50%, 100%   { opacity: 1; z-index: 5; }
}

/* Overlay wrapper slides from LEFT to RIGHT */
.hl-auth-main.active .hl-overlay-wrap {
  transform: translateX(100%);
}

/* Inside overlay: shift content to bring right sub-panel into view */
.hl-auth-main.active .hl-overlay {
  transform: translateX(-50%);
}

/* Left panel slides slightly further left (depth illusion) */
.hl-auth-main.active .hl-ov-left {
  transform: translateX(-20%);
}

/* Right panel settles from slight overshoot */
.hl-auth-main.active .hl-ov-right {
  transform: translateX(0);
}

/* ═══════════════════════════════════════════════
   OVERLAY TEXT & BUTTON STYLES
═══════════════════════════════════════════════ */
.hl-ov-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
  margin-bottom: 2.5rem;
}

.hl-ov-logo img { width: 22px; height: 22px; object-fit: contain; }

.hl-ov-h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(1.9rem, 2.8vw, 2.6rem);
  font-weight: 400;
  color: #fff;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}

.hl-ov-h2 em { font-style: italic; color: #D63B8A; }

.hl-ov-sub {
  font-size: 0.85rem;
  line-height: 1.68;
  color: #78716C;
  margin: 0 0 2.25rem;
  max-width: 230px;
}

.hl-ov-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.65rem 1.5rem;
  border-radius: 10px;
  border: 1.5px solid rgba(255,255,255,.28);
  background: transparent;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
}

.hl-ov-btn:hover {
  background: rgba(214,59,138,.18);
  border-color: rgba(214,59,138,.5);
  color: #F4AACC;
}

/* Register action button on overlay — matches landing page Register pill */
.hl-ov-btn-register {
  background: #fce4ec;
  border-color: #f8bbd9;
  color: #ad246d;
  font-weight: 700;
}

.hl-ov-btn-register:hover {
  background: #f48fb1;
  border-color: #f48fb1;
  color: #fff;
}

/* ═══════════════════════════════════════════════
   FORM INNER WRAPPER
═══════════════════════════════════════════════ */
.hl-form-inner {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
}

/* ── Tabs ── */
.hl-tabs {
  display: flex;
  border-bottom: 1.5px solid #EEEDE8;
  margin-bottom: 1.4rem;
}

.hl-tab {
  padding: 0.45rem 1rem 0.55rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #A8A29E;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Inter', sans-serif;
}

.hl-tab.on {
  color: #1C1917;
  border-bottom-color: #D63B8A;
}

/* ── Heading ── */
.hl-form-h1 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.45rem;
  font-weight: 700;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0 0 0.2rem;
}

.hl-form-sub {
  font-size: 0.83rem;
  color: #78716C;
  margin: 0 0 1.1rem;
}

/* ── Demo card ── */
.hl-demo-card {
  background: #FFF0F8;
  border: 1px solid rgba(214,59,138,.2);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 0.9rem;
}

.hl-demo-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #B52B72;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.15rem;
}

.hl-demo-hint {
  font-size: 0.71rem;
  color: #78716C;
  margin: 0 0 0.55rem;
}

.hl-demo-btns { display: flex; flex-wrap: wrap; gap: 0.3rem; }

.hl-demo-btn {
  padding: 0.26rem 0.55rem;
  border-radius: 6px;
  border: 1px solid rgba(214,59,138,.25);
  background: #fff;
  font-size: 0.71rem;
  font-weight: 600;
  color: #B52B72;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Inter', sans-serif;
}

.hl-demo-btn:hover { background: #D63B8A; color: #fff; border-color: #D63B8A; }
.hl-demo-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Field ── */
.hl-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}

.hl-label {
  font-size: 0.73rem;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.01em;
}

.hl-input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 1.5px solid #E5E5E0;
  border-radius: 10px;
  background: #FAFAF9;
  font-size: 0.875rem;
  color: #1C1917;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
  -webkit-appearance: none;
}

.hl-input::placeholder { color: #B8B5B0; }

.hl-input:focus {
  border-color: #D63B8A;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(214,59,138,.11);
}

.hl-field-err {
  font-size: 0.69rem;
  color: #B45454;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* ── Two column grid ── */
.hl-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }

/* ── Phone input ── */
.hl-phone-row {
  display: flex;
  align-items: stretch;
  border: 1.5px solid #E5E5E0;
  border-radius: 10px;
  background: #FAFAF9;
  overflow: hidden;
  transition: border-color 0.18s, box-shadow 0.18s;
}
.hl-phone-row:focus-within {
  border-color: #D63B8A;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(214,59,138,.11);
}
.hl-phone-prefix {
  padding: 0 0.55rem;
  font-size: 0.73rem;
  font-weight: 600;
  color: #57534E;
  border-right: 1px solid #E5E5E0;
  background: #F0F0EB;
  display: flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.hl-phone-input {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  flex: 1;
  outline: none;
  padding: 0.58rem 0.7rem;
  font-size: 0.865rem;
  color: #1C1917;
  font-family: 'Inter', sans-serif;
}

/* ── User type selector ── */
.hl-type-row { display: flex; gap: 0.45rem; margin-bottom: 0.6rem; }
.hl-type-opt  { flex: 1; }
.hl-type-opt input { display: none; }
.hl-type-lbl {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: 1.5px solid #E5E5E0;
  border-radius: 10px;
  font-size: 0.81rem;
  font-weight: 600;
  color: #78716C;
  cursor: pointer;
  background: #FAFAF9;
  transition: all 0.15s;
  text-align: center;
}
.hl-type-opt input:checked + .hl-type-lbl {
  border-color: #D63B8A;
  color: #D63B8A;
  background: #FFF0F8;
}

/* ── Password requirements ── */
.hl-pw-reqs { display: flex; flex-direction: column; gap: 2px; margin: 2px 0 3px 2px; }
.hl-pw-req  { display: flex; align-items: center; gap: 4px; font-size: 0.66rem; font-weight: 500; color: #A8A29E; transition: color 0.18s; }
.hl-pw-req.ok  { color: #4A7C59; }
.hl-pw-req.bad { color: #B45454; }

/* ── Forgot link ── */
.hl-forgot {
  font-size: 0.75rem;
  color: #A8A29E;
  text-align: right;
  display: block;
  margin: -0.25rem 0 0.6rem;
  cursor: pointer;
  transition: color 0.15s;
}
.hl-forgot:hover { color: #D63B8A; }

/* ── Submit button ── */
.hl-submit {
  width: 100%;
  padding: 0.72rem;
  border-radius: 10px;
  background: #fce4ec;
  color: #ad246d;
  font-size: 0.88rem;
  font-weight: 700;
  border: 1.5px solid #f8bbd9;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.4rem;
  letter-spacing: 0.01em;
  font-family: 'Inter', sans-serif;
}
.hl-submit:hover:not(:disabled) {
  background: #f48fb1;
  border-color: #f48fb1;
  color: #fff;
  box-shadow: 0 4px 14px rgba(214,59,138,.25);
  transform: translateY(-1px);
}
.hl-submit:disabled { opacity: 0.55; cursor: not-allowed; }

/* Register-specific submit — pill shape matching landing Register button */
.hl-submit-register {
  border-radius: 999px !important;
  font-size: 0.92rem;
  letter-spacing: 0.015em;
}

/* ── Full-screen loader ── */
.hl-loader {
  position: fixed; inset: 0;
  background: rgba(250,250,249,.88);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.9rem;
}
.hl-spinner {
  width: 40px; height: 40px;
  border: 3px solid #E5E5E0;
  border-top-color: #D63B8A;
  border-radius: 50%;
  animation: hlspin .7s linear infinite;
}
@keyframes hlspin { to { transform: rotate(360deg); } }
.hl-loader-text { font-size: 0.84rem; color: #78716C; font-weight: 500; }

/* ── Password input box (inside .hl-field) ── */
.hl-auth-root .input-box { margin: 0 !important; }
.hl-auth-root .input-box input {
  width: 100% !important;
  padding: 0.58rem 3rem 0.58rem 0.85rem !important;
  border: 1.5px solid #E5E5E0 !important;
  border-radius: 10px !important;
  background: #FAFAF9 !important;
  font-size: 0.865rem !important;
  color: #1C1917 !important;
  outline: none !important;
  transition: border-color 0.18s, box-shadow 0.18s !important;
  backdrop-filter: none !important;
}
.hl-auth-root .input-box input:focus {
  border-color: #D63B8A !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(214,59,138,.11) !important;
}
.hl-auth-root .input-wrapper { margin: 0 !important; }
.hl-auth-root .ajax-error { font-size: 0.69rem !important; color: #B45454 !important; background: transparent !important; border: none !important; padding: 0 !important; margin-top: 2px !important; }

/* ═══════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════ */
@media (max-width: 700px) {
  .hl-auth-main {
    min-height: 100vh;
    border-radius: 0;
    box-shadow: none;
    width: 100%;
  }
  .hl-overlay-wrap { display: none; }
  .hl-login-box    { right: auto; left: 0; width: 100%; }
  .hl-register-box { left: 0; width: 100%; }
  .hl-auth-main.active .hl-login-box    { transform: translateX(-100%); }
  .hl-auth-main.active .hl-register-box { opacity: 1; z-index: 5; pointer-events: auto; }
  .hl-form-box { justify-content: flex-start; padding-top: 2rem; }
  .hl-2col { grid-template-columns: 1fr; }
}
`;

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
const AuthPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({ initialMode: _im = 'register' }) => {
  const { user, login, loginAs, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already logged in and visits /login, redirect them
  useEffect(() => {
    if (user) {
      const dashboardPath: Record<string, string> = {
        admin: '/admin/dashboard',
        staff: '/staff/dashboard',
        wigmaker: '/wigmaker/dashboard',
        recipient: '/recipient/dashboard',
        donor: '/donor/dashboard',
      };
      navigate(dashboardPath[user.role] || '/donor/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [isReg, setIsReg] = useState(location.pathname === '/register');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'newpw' | 'done'>('email');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const resetForgot = () => {
    setForgotStep('email'); setForgotEmail(''); setForgotOtp('');
    setForgotNewPw(''); setForgotConfirmPw(''); setForgotLoading(false); setForgotError('');
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address.'); return; }
    setForgotLoading(true); setForgotError('');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
    setForgotLoading(false);
    if (error) { setForgotError(error.message); } else { setForgotStep('otp'); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim()) { setForgotError('Please enter the code from your email.'); return; }
    setForgotLoading(true); setForgotError('');
    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail.trim(),
      token: forgotOtp.trim(),
      type: 'recovery',
    });
    setForgotLoading(false);
    if (error) { setForgotError('Invalid or expired code. Please try again.'); }
    else { setForgotStep('newpw'); }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPw.length < 8) { setForgotError('Password must be at least 8 characters.'); return; }
    if (!/[0-9]/.test(forgotNewPw)) { setForgotError('Password must contain a number.'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>_]/.test(forgotNewPw)) { setForgotError('Password must contain a symbol.'); return; }
    if (forgotNewPw !== forgotConfirmPw) { setForgotError('Passwords do not match.'); return; }
    setForgotLoading(true); setForgotError('');
    const { error } = await supabase.auth.updateUser({ password: forgotNewPw });
    setForgotLoading(false);
    if (error) { setForgotError(error.message); }
    else { setForgotStep('done'); }
  };
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({
    userType: '', first_name: '', last_name: '',
    country: 'ph', region: '', postal_code: '',
    age: '', gender: '', phone: '', email: '',
    password: '', password_confirmation: ''
  });

  useEffect(() => {
    setIsReg(location.pathname === '/register');
  }, [location.pathname]);

  // Sync URL with state
  const switchTo = (toReg: boolean) => {
    setErrors({});
    setIsReg(toReg);
    navigate(toReg ? '/register' : '/login', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrors({});
    try {
      const res = await login(loginData.email, loginData.password);
      navigate(res.redirect, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 422) setErrors(err.response.data.errors);
      else setErrors({ email: [err.response?.data?.error || err.response?.data?.message || 'Login failed.'] });
    } finally { setLoading(false); }
  };

  const validateRegistration = (): Record<string, string[]> => {
    const errs: Record<string, string[]> = {};
    const emailRe = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const phoneDigits = (reg.phone || '').replace('+63', '').replace(/\D/g, '');
    const ageNum = parseInt(reg.age, 10);

    if (!reg.userType) errs.userType = ['Please choose Donor or Recipient.'];
    if (!reg.first_name.trim()) errs.first_name = ['First name is required.'];
    else if (reg.first_name.trim().length < 2) errs.first_name = ['First name is too short.'];
    if (!reg.last_name.trim()) errs.last_name = ['Last name is required.'];
    else if (reg.last_name.trim().length < 2) errs.last_name = ['Last name is too short.'];
    if (!reg.region.trim()) errs.region = ['Region / province is required.'];
    if (!reg.postal_code.trim()) errs.postal_code = ['Postal code is required.'];
    else if (!/^\d{4}$/.test(reg.postal_code.trim())) errs.postal_code = ['Postal code must be 4 digits.'];
    if (!reg.age) errs.age = ['Age is required.'];
    else if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) errs.age = ['Enter a valid age (13–120).'];
    if (!reg.gender) errs.gender = ['Please select a gender.'];
    if (!reg.email.trim()) errs.email = ['Email is required.'];
    else if (!emailRe.test(reg.email.trim())) errs.email = ['Enter a valid email address.'];
    if (!phoneDigits) errs.phone = ['Mobile number is required.'];
    else if (phoneDigits.length !== 10) errs.phone = ['Mobile number must be 10 digits after +63.'];
    else if (!phoneDigits.startsWith('9')) errs.phone = ['PH mobile numbers start with 9 (e.g. 9171234567).'];

    if (!reg.password) errs.password = ['Password is required.'];
    else {
      const issues: string[] = [];
      if (reg.password.length < 8) issues.push('At least 8 characters.');
      if (!/[0-9]/.test(reg.password)) issues.push('Must include a number.');
      if (!/[!@#$%^&*(),.?":{}|<>_]/.test(reg.password)) issues.push('Must include a symbol.');
      if (issues.length) errs.password = issues;
    }
    if (!reg.password_confirmation) errs.password_confirmation = ['Please confirm your password.'];
    else if (reg.password && reg.password !== reg.password_confirmation) errs.password_confirmation = ['Passwords do not match.'];

    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientErrors = validateRegistration();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setLoading(true); setErrors({});
    try {
      const res = await register(reg);
      navigate(res.redirect, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 422) setErrors(err.response.data.errors);
      else setErrors({ email: [err.response?.data?.error || err.response?.data?.message || 'Registration failed.'] });
    } finally { setLoading(false); }
  };

  const handleDemo = async (role: string) => {
    setDemoLoading(role); setErrors({});
    try { await loginAs(role); }
    catch { setErrors({ email: ['Demo login failed.'] }); }
    finally { setDemoLoading(null); }
  };

  const demoRoles = [
    { key: 'admin', label: 'Admin', icon: '🛡️' },
    { key: 'donor', label: 'Donor', icon: '💇' },
    { key: 'recipient', label: 'Recipient', icon: '🎀' },
    { key: 'staff', label: 'Staff', icon: '👩‍⚕️' },
    { key: 'wigmaker', label: 'Wigmaker', icon: '✂️' },
  ];

  const pw = reg.password;
  const pwReqs = [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'Contains a number',     ok: /[0-9]/.test(pw) },
    { label: 'Contains a symbol',     ok: /[!@#$%^&*(),.?":{}|<>_]/.test(pw) },
  ];

  return (
    <>
    <main className="hl-auth-root">
      <style>{authStyles}</style>

      {/* Full-screen loader */}
      {loading && (
        <div className="hl-loader">
          <div className="hl-spinner" />
          <span className="hl-loader-text">
            {isReg ? 'Creating your account…' : 'Signing you in…'}
          </span>
        </div>
      )}

      {/* ── Card ── */}
      <div className={`hl-auth-main${isReg ? ' active' : ''}`}>

        {/* ─────────────────────────────────────────
            LOGIN FORM (starts on the RIGHT)
        ───────────────────────────────────────── */}
        <div className="hl-form-box hl-login-box">
          <div className="hl-form-inner">
            {/* Tabs Removed */}

            <h1 className="hl-form-h1">Sign in</h1>
            <p className="hl-form-sub">We've missed you. Log in to continue your HairLink journey.</p>

            {/* Demo access */}
            {isDev && (
              <div className="hl-demo-card">
                <p className="hl-demo-label">Quick Demo Access</p>
                <p className="hl-demo-hint">Development only — one-click login as any role.</p>
                <div className="hl-demo-btns">
                  {demoRoles.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      className="hl-demo-btn"
                      disabled={demoLoading !== null}
                      onClick={() => handleDemo(key)}
                      style={{ opacity: demoLoading && demoLoading !== key ? 0.45 : 1 }}
                    >
                      {demoLoading === key ? '…' : `${icon} ${label}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin}>
              <div className="hl-field">
                <label className="hl-label">Email Address</label>
                <input
                  className="hl-input"
                  type="email"
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                  autoComplete="email"
                  required
                />
                {errors.email && <span className="hl-field-err">⚠ {errors.email[0]}</span>}
              </div>

              <div className="hl-field">
                <label className="hl-label">Password</label>
                <PasswordInput
                  id="login-password"
                  placeholder="Your password"
                  value={loginData.password}
                  onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                  error={errors.password}
                  required
                />
              </div>

              <span
                className="hl-forgot"
                style={{ cursor: 'pointer' }}
                onClick={() => { setShowForgot(true); resetForgot(); }}
              >
                Forgot password?
              </span>

              <button type="submit" className="hl-submit" disabled={loading}>
                Sign In
              </button>
            </form>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            REGISTER FORM (starts on the LEFT, hidden)
        ───────────────────────────────────────── */}
        <div className="hl-form-box hl-register-box">
          <div className="hl-form-inner">
            {/* Tabs Removed */}

            <h1 className="hl-form-h1">Create account</h1>
            <p className="hl-form-sub">Join HairLink and start making a difference.</p>

            <form onSubmit={handleRegister}>
              {/* User type */}
              <div style={{ marginBottom: '0.6rem' }}>
                <label className="hl-label" style={{ display: 'block', marginBottom: '0.3rem' }}>I am a…</label>
                <div className="hl-type-row">
                  {[
                    { val: 'donor',     lbl: '💇 Donor' },
                    { val: 'recipient', lbl: '🎀 Recipient' }
                  ].map(o => (
                    <label key={o.val} className="hl-type-opt">
                      <input
                        type="radio"
                        name="userType"
                        value={o.val}
                        checked={reg.userType === o.val}
                        onChange={e => setReg({ ...reg, userType: e.target.value })}
                        required
                      />
                      <span className="hl-type-lbl">{o.lbl}</span>
                    </label>
                  ))}
                </div>
                {errors.userType && <span className="hl-field-err">⚠ {errors.userType[0]}</span>}
              </div>

              {/* Name */}
              <div className="hl-2col">
                <div className="hl-field">
                  <label className="hl-label">First Name</label>
                  <input className="hl-input" type="text" placeholder="Maria"
                    value={reg.first_name} onChange={e => setReg({ ...reg, first_name: e.target.value })} required />
                  {errors.first_name && <span className="hl-field-err">⚠ {errors.first_name[0]}</span>}
                </div>
                <div className="hl-field">
                  <label className="hl-label">Last Name</label>
                  <input className="hl-input" type="text" placeholder="Santos"
                    value={reg.last_name} onChange={e => setReg({ ...reg, last_name: e.target.value })} required />
                  {errors.last_name && <span className="hl-field-err">⚠ {errors.last_name[0]}</span>}
                </div>
              </div>

              {/* Location */}
              <div className="hl-2col">
                <div className="hl-field">
                  <label className="hl-label">Region / Province</label>
                  <input className="hl-input" type="text" placeholder="Metro Manila"
                    value={reg.region} onChange={e => setReg({ ...reg, region: e.target.value })} required />
                  {errors.region && <span className="hl-field-err">⚠ {errors.region[0]}</span>}
                </div>
                <div className="hl-field">
                  <label className="hl-label">Postal Code</label>
                  <input className="hl-input" type="text" placeholder="1006"
                    value={reg.postal_code} onChange={e => setReg({ ...reg, postal_code: e.target.value.replace(/\D/g,'') })} required />
                  {errors.postal_code && <span className="hl-field-err">⚠ {errors.postal_code[0]}</span>}
                </div>
              </div>

              {/* Age + Gender */}
              <div className="hl-2col">
                <div className="hl-field">
                  <label className="hl-label">Age</label>
                  <input className="hl-input" type="number" placeholder="25"
                    value={reg.age} onChange={e => setReg({ ...reg, age: e.target.value })} required />
                  {errors.age && <span className="hl-field-err">⚠ {errors.age[0]}</span>}
                </div>
                <div className="hl-field">
                  <label className="hl-label">Gender</label>
                  <select className="hl-input hl-select" value={reg.gender} onChange={e => setReg({ ...reg, gender: e.target.value })} required>
                    <option value="" disabled>Select…</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="prefer_not_say">Prefer not to say</option>
                  </select>
                  {errors.gender && <span className="hl-field-err">⚠ {errors.gender[0]}</span>}
                </div>
              </div>

              {/* Email */}
              <div className="hl-field">
                <label className="hl-label">Email Address</label>
                <input className="hl-input" type="email" placeholder="you@example.com"
                  value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} required />
                {errors.email && <span className="hl-field-err">⚠ {errors.email[0]}</span>}
              </div>

              {/* Phone */}
              <div className="hl-field">
                <label className="hl-label">Mobile Number</label>
                <div className="hl-phone-row">
                  <span className="hl-phone-prefix">🇵🇭 +63</span>
                  <input
                    className="hl-phone-input"
                    type="tel"
                    placeholder="9171234567"
                    value={reg.phone.replace('+63', '')}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      // Handle pasted/typed country code or leading zero prefixes
                      if (val.startsWith('639')) {
                        val = val.slice(2);
                      } else if (val.startsWith('09')) {
                        val = val.slice(1);
                      }
                      
                      // Enforce that the number must start with 9
                      if (val.length > 0 && !val.startsWith('9')) {
                        val = '';
                      }
                      
                      const d = val.slice(0, 10);
                      setReg({ ...reg, phone: d ? '+63' + d : '' });
                    }}
                    required
                    minLength={10}
                    pattern="9[0-9]{9}"
                    title="Mobile number must be exactly 10 digits starting with 9 (e.g. 9171234567)"
                  />
                </div>
                {errors.phone && <span className="hl-field-err">⚠ {errors.phone[0]}</span>}
              </div>

              {/* Passwords */}
              <div className="hl-2col">
                <div className="hl-field">
                  <label className="hl-label">Password</label>
                  <PasswordInput
                    id="reg-password"
                    placeholder="Min 8 characters"
                    value={reg.password}
                    onChange={e => setReg({ ...reg, password: e.target.value })}
                    error={errors.password}
                    required
                  />
                  {reg.password && (
                    <div className="hl-pw-reqs">
                      {pwReqs.map((r, i) => (
                        <span key={i} className={`hl-pw-req ${r.ok ? 'ok' : 'bad'}`}>
                          <i className={`bx ${r.ok ? 'bx-check-circle' : 'bx-circle'}`} style={{ fontSize: '0.76rem' }} />
                          {r.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hl-field">
                  <label className="hl-label">Confirm Password</label>
                  <PasswordInput
                    id="reg-confirm"
                    placeholder="Repeat password"
                    value={reg.password_confirmation}
                    onChange={e => setReg({ ...reg, password_confirmation: e.target.value })}
                    required
                  />
                  {errors.password_confirmation && <span className="hl-field-err">⚠ {errors.password_confirmation[0]}</span>}
                  {reg.password_confirmation && (
                    <div className="hl-pw-reqs">
                      <span className={`hl-pw-req ${reg.password === reg.password_confirmation ? 'ok' : 'bad'}`}>
                        <i className={`bx ${reg.password === reg.password_confirmation ? 'bx-check-circle' : 'bx-x-circle'}`} style={{ fontSize: '0.76rem' }} />
                        {reg.password === reg.password_confirmation ? 'Passwords match' : 'Do not match'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="hl-submit hl-submit-register" disabled={loading}>
                Create Account
              </button>
            </form>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            DARK OVERLAY (slides left ↔ right)
        ───────────────────────────────────────── */}
        <div className="hl-overlay-wrap">
          <div className="hl-overlay">

            {/* LEFT sub-panel — visible in DEFAULT (login) state */}
            <div className="hl-ov-panel hl-ov-left">
              <div className="hl-ov-logo">
                <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
                <span>HairLink</span>
              </div>
              <h2 className="hl-ov-h2">
                Welcome<br /><em>back.</em>
              </h2>
              <p className="hl-ov-sub">
                Log in to continue your HairLink journey and track the impact of your donation.
              </p>
              <button type="button" className="hl-ov-btn hl-ov-btn-register" onClick={() => switchTo(true)}>
                Create an Account →
              </button>
            </div>

            {/* RIGHT sub-panel — visible in ACTIVE (register) state */}
            <div className="hl-ov-panel hl-ov-right">
              <div className="hl-ov-logo">
                <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
                <span>HairLink</span>
              </div>
              <h2 className="hl-ov-h2">
                Hello,<br /><em>Welcome!</em>
              </h2>
              <p className="hl-ov-sub">
                Already part of Strand Up for Cancer? Sign in to see your impact.
              </p>
              <button type="button" className="hl-ov-btn" onClick={() => switchTo(false)}>
                ← Go to Login
              </button>
            </div>

          </div>
        </div>

      </div>
    </main>

    {/* ── Forgot Password Modal ── */}
    {showForgot && (
      <div
        onClick={e => { if (e.target === e.currentTarget && !forgotLoading) { setShowForgot(false); resetForgot(); } }}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

          {/* Step 1 — Email */}
          {forgotStep === 'email' && (
            <form onSubmit={handleSendCode}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a1a1a' }}>Reset Password</h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>Enter your email and we'll send you a verification code.</p>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Email Address</label>
              <input type="email" required placeholder="you@example.com" value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: `1.5px solid ${forgotError ? '#ef4444' : '#e5e7eb'}`, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              {forgotError && <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#ef4444' }}>{forgotError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowForgot(false); resetForgot(); }}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: '50px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={forgotLoading}
                  style={{ flex: 2, padding: '0.7rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.875rem', cursor: forgotLoading ? 'not-allowed' : 'pointer', opacity: forgotLoading ? 0.7 : 1 }}>
                  {forgotLoading ? 'Sending…' : 'Send Code'}
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Enter code */}
          {forgotStep === 'otp' && (
            <form onSubmit={handleVerifyCode}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fdf2f8', display: 'grid', placeItems: 'center', margin: '0 auto 0.75rem' }}>
                  <i className="bx bx-envelope-open" style={{ fontSize: '1.6rem', color: '#D63B8A' }}></i>
                </div>
                <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a1a1a' }}>Enter Verification Code</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>We sent a 6-digit code to <strong>{forgotEmail}</strong></p>
              </div>
              <input type="text" inputMode="numeric" maxLength={6} required placeholder="000000" value={forgotOtp}
                onChange={e => { setForgotOtp(e.target.value.replace(/\D/g, '')); setForgotError(''); }}
                style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: `1.5px solid ${forgotError ? '#ef4444' : '#e5e7eb'}`, fontSize: '1.6rem', fontWeight: 800, textAlign: 'center', letterSpacing: '0.5rem', outline: 'none', boxSizing: 'border-box' }} />
              {forgotError && <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: '#ef4444', textAlign: 'center' }}>{forgotError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setForgotStep('email'); setForgotError(''); }}
                  style={{ flex: 1, padding: '0.7rem', borderRadius: '50px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>← Back</button>
                <button type="submit" disabled={forgotLoading}
                  style={{ flex: 2, padding: '0.7rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.875rem', cursor: forgotLoading ? 'not-allowed' : 'pointer', opacity: forgotLoading ? 0.7 : 1 }}>
                  {forgotLoading ? 'Verifying…' : 'Verify Code'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — New password */}
          {forgotStep === 'newpw' && (
            <form onSubmit={handleSetNewPassword}>
              <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a1a1a' }}>Set New Password</h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>Enter a new password for your account.</p>

              {/* New password */}
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>New Password</label>
              <input type="password" required placeholder="New password" value={forgotNewPw}
                onChange={e => { setForgotNewPw(e.target.value); setForgotError(''); }}
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

              {/* Live requirements */}
              <div className="hl-pw-reqs" style={{ marginBottom: '1rem' }}>
                {[
                  { label: 'At least 8 characters', ok: forgotNewPw.length >= 8 },
                  { label: 'Contains a number',     ok: /[0-9]/.test(forgotNewPw) },
                  { label: 'Contains a symbol',     ok: /[!@#$%^&*(),.?":{}|<>_]/.test(forgotNewPw) },
                ].map((r, i) => (
                  <span key={i} className={`hl-pw-req ${forgotNewPw ? (r.ok ? 'ok' : 'bad') : ''}`}>
                    <i className={`bx ${r.ok ? 'bx-check-circle' : 'bx-circle'}`} />
                    {r.label}
                  </span>
                ))}
              </div>

              {/* Confirm password */}
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Confirm New Password</label>
              <input type="password" required placeholder="Re-enter new password" value={forgotConfirmPw}
                onChange={e => { setForgotConfirmPw(e.target.value); setForgotError(''); }}
                style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.4rem' }} />

              {/* Match indicator */}
              {forgotConfirmPw && (
                <span className={`hl-pw-req ${forgotNewPw === forgotConfirmPw ? 'ok' : 'bad'}`} style={{ marginBottom: '0.5rem', display: 'flex' }}>
                  <i className={`bx ${forgotNewPw === forgotConfirmPw ? 'bx-check-circle' : 'bx-x-circle'}`} />
                  {forgotNewPw === forgotConfirmPw ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}

              {forgotError && <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#ef4444' }}>{forgotError}</p>}

              <button type="submit" disabled={forgotLoading}
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: forgotLoading ? 'not-allowed' : 'pointer', opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          )}

          {/* Step 4 — Done */}
          {forgotStep === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f0fdf4', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
                <i className="bx bx-check-circle" style={{ fontSize: '2rem', color: '#10b981' }}></i>
              </div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: '#1a1a1a' }}>Password Updated!</h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>Your password has been reset. You can now log in.</p>
              <button onClick={() => { setShowForgot(false); resetForgot(); }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '50px', border: 'none', background: 'linear-gradient(135deg,#D63B8A,#e8559e)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    )}
    </>
  );
};

export default AuthPage;
