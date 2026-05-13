import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';

const isDev = import.meta.env.DEV;

const AuthPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({ initialMode: _initialMode = 'register' }) => {
  const { login, loginAs, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>(
    location.pathname === '/login' ? 'login' : 'register'
  );
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    userType: '',
    first_name: '',
    last_name: '',
    country: 'ph',
    region: '',
    postal_code: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: ''
  });

  useEffect(() => {
    if (location.pathname === '/login') {
      setMode('login');
    } else if (location.pathname === '/register') {
      setMode('register');
    }
  }, [location.pathname]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await login(loginData.email, loginData.password);
      navigate(res.redirect);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ email: [err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const res = await register(registerData);
      navigate(res.redirect);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ email: [err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    setDemoLoading(role);
    setErrors({});
    try {
      await loginAs(role);
    } catch {
      setErrors({ email: ['Demo login failed. Please ensure demo accounts are seeded.'] });
    } finally {
      setDemoLoading(null);
    }
  };

  const demoRoles = [
    { key: 'admin',     label: 'Admin',     icon: '🛡️' },
    { key: 'donor',     label: 'Donor',     icon: '💇' },
    { key: 'recipient', label: 'Recipient', icon: '🎀' },
    { key: 'staff',     label: 'Staff',     icon: '👩‍⚕️' },
    { key: 'wigmaker',  label: 'Wigmaker',  icon: '✂️' },
  ];

  return (
    <main className="auth-shell">
      {loading && (
        <div id="fullScreenLoader" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.9)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #ff6b81', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h2 style={{ marginTop: '15px', color: '#333', fontFamily: "'Manrope', sans-serif" }}>{mode === 'login' ? 'Logging in...' : 'Creating your account...'}</h2>
        </div>
      )}

      <div className={`container ${mode === 'register' ? 'active' : ''}`} id="authContainer">
        {/* ─── Login Form ─── */}
        <div className="form-box login">
          <form onSubmit={handleLoginSubmit}>
            <h1>Login</h1>
            <p className="form-subtitle">We've missed you. Log in to continue your HairLink journey.</p>

            {/* Dev-only demo role buttons */}
            {isDev && (
              <div className="demo-account-card" style={{ marginBottom: '20px' }}>
                <p className="demo-account-title" style={{ marginBottom: '4px' }}>Quick Demo Access</p>
                <p className="demo-account-copy" style={{ marginBottom: '12px' }}>Development only — one-click login as any role.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {demoRoles.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      id={`demo-login-${key}`}
                      type="button"
                      className="demo-fill-btn"
                      disabled={demoLoading !== null}
                      onClick={() => handleDemoLogin(key)}
                      style={{ opacity: demoLoading && demoLoading !== key ? 0.5 : 1 }}
                    >
                      {demoLoading === key ? '…' : `${icon} ${label}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="input-wrapper">
              <div className="input-box">
                <input
                  id="login-email"
                  type="email"
                  placeholder="Email"
                  value={loginData.email}
                  onChange={e => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
                <i className='bx bxs-envelope'></i>
              </div>
              {errors.email && <div className="ajax-error" style={{ display: 'block' }}>{errors.email[0]}</div>}
            </div>

            <PasswordInput
              id="login-password"
              placeholder="Password"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              error={errors.password}
              required
            />

            <div className="forgot-link">
              <a href="#">Forgot Password?</a>
            </div>

            <button id="login-submit-btn" type="submit" className="btn">Login</button>
          </form>
        </div>

        {/* ─── Register Form ─── */}
        <div className="form-box register">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Create Your Account</h1>
            <p className="form-subtitle">Sign up as a donor or recipient to join the mission.</p>

            <div className="user-type-group">
              <span className="user-type-label">User Type</span>
              <div className="user-type-options">
                <label className="user-type-option">
                  <input type="radio" name="userType" value="donor" checked={registerData.userType === 'donor'} onChange={e => setRegisterData({ ...registerData, userType: e.target.value })} required />
                  <span>Donor</span>
                </label>
                <label className="user-type-option">
                  <input type="radio" name="userType" value="recipient" checked={registerData.userType === 'recipient'} onChange={e => setRegisterData({ ...registerData, userType: e.target.value })} required />
                  <span>Recipient</span>
                </label>
              </div>
              {errors.userType && <div className="ajax-error" style={{ display: 'block', paddingLeft: 0 }}>{errors.userType[0]}</div>}
            </div>

            {/* 1. Name Row */}
            <div className="grid-two-cols">
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-first-name" type="text" placeholder="First Name" value={registerData.first_name} onChange={e => setRegisterData({ ...registerData, first_name: e.target.value })} required />
                  <i className='bx bxs-user'></i>
                </div>
                {errors.first_name && <div className="ajax-error" style={{ display: 'block' }}>{errors.first_name[0]}</div>}
              </div>
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-last-name" type="text" placeholder="Last Name" value={registerData.last_name} onChange={e => setRegisterData({ ...registerData, last_name: e.target.value })} required />
                  <i className='bx bxs-user'></i>
                </div>
                {errors.last_name && <div className="ajax-error" style={{ display: 'block' }}>{errors.last_name[0]}</div>}
              </div>
            </div>

            {/* 2. Location Row (Simplified) */}
            <div className="grid-two-cols">
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-region" type="text" placeholder="Region / Province" value={registerData.region} onChange={e => setRegisterData({ ...registerData, region: e.target.value })} required />
                  <i className='bx bxs-map'></i>
                </div>
                {errors.region && <div className="ajax-error" style={{ display: 'block' }}>{errors.region[0]}</div>}
              </div>
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-postal" type="text" placeholder="Postal Code" value={registerData.postal_code} onChange={e => setRegisterData({ ...registerData, postal_code: e.target.value.replace(/[^0-9]/g, '') })} required />
                  <i className='bx bxs-home'></i>
                </div>
                {errors.postal_code && <div className="ajax-error" style={{ display: 'block' }}>{errors.postal_code[0]}</div>}
              </div>
            </div>

            {/* 3. Profile Row (Age/Gender) */}
            <div className="grid-two-cols">
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-age" type="number" placeholder="Age" value={registerData.age} onChange={e => setRegisterData({ ...registerData, age: e.target.value })} required />
                  <i className='bx bx-calendar'></i>
                </div>
                {errors.age && <div className="ajax-error" style={{ display: 'block' }}>{errors.age[0]}</div>}
              </div>
              <div className="input-wrapper">
                <div className="input-box select-wrapper">
                  <select id="reg-gender" value={registerData.gender} onChange={e => setRegisterData({ ...registerData, gender: e.target.value })} required>
                    <option value="" disabled>Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="nonbinary">Non-binary</option>
                    <option value="prefer_not_say">Prefer not to say</option>
                  </select>
                  <i className='bx bx-user-circle'></i>
                </div>
                {errors.gender && <div className="ajax-error" style={{ display: 'block' }}>{errors.gender[0]}</div>}
              </div>
            </div>

            {/* 4. Contact Row (Email/Phone) */}
            <div className="grid-two-cols">
              <div className="input-wrapper">
                <div className="input-box">
                  <input id="reg-email" type="email" placeholder="Email Address" value={registerData.email} onChange={e => setRegisterData({ ...registerData, email: e.target.value })} required />
                  <i className='bx bxs-envelope'></i>
                </div>
                {errors.email && <div className="ajax-error" style={{ display: 'block' }}>{errors.email[0]}</div>}
              </div>
              <div className="input-wrapper">
                <div className="input-box" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  border: '1px solid #e8d8e8', 
                  borderRadius: '8px',
                  background: '#fff',
                  overflow: 'hidden',
                  margin: '0.6rem 0',
                  height: 'calc(1.5em + 0.84rem + 2px)' // Match standard input height exactly
                }}>
                  <div style={{ 
                    padding: '0 0.5rem', 
                    fontSize: '0.75rem', 
                    color: '#675c6f', 
                    borderRight: '1px solid #e8d8e8',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    background: '#fcfafc',
                    whiteSpace: 'nowrap'
                  }}>
                    🇵🇭 +63
                  </div>
                  <input 
                    id="reg-phone" 
                    type="tel" 
                    placeholder="9171234567" 
                    value={registerData.phone.replace('+63', '')} 
                    onChange={e => {
                      const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setRegisterData({ ...registerData, phone: digits ? '+63' + digits : '' });
                    }} 
                    style={{ border: 'none', padding: '0 0.58rem', flex: 1, outline: 'none', height: '100%', fontSize: 'inherit' }}
                    required 
                  />
                  <i className='bx bxs-phone' style={{ 
                    position: 'absolute', 
                    right: '0.7rem', 
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9f8ba8', 
                    fontSize: '0.9rem',
                    pointerEvents: 'none'
                  }}></i>
                </div>
                {errors.phone && <div className="ajax-error" style={{ display: 'block' }}>{errors.phone[0]}</div>}
              </div>
            </div>

            {/* 5. Security Row */}
            <div className="grid-two-cols">
              <div className="input-wrapper">
                <PasswordInput
                  id="reg-password"
                  placeholder="Password"
                  value={registerData.password}
                  onChange={e => setRegisterData({ ...registerData, password: e.target.value })}
                  error={errors.password}
                  required
                />
                {/* Real-time requirements checker */}
                <div className="password-requirements" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px', 
                  marginTop: '-4px', 
                  paddingLeft: '4px',
                  marginBottom: '8px'
                }}>
                  {[
                    { label: 'At least 8 characters', met: registerData.password.length >= 8 },
                    { label: 'At least 1 number', met: /[0-9]/.test(registerData.password) },
                    { label: 'At least 1 symbol (@$!%*?&)', met: /[!@#$%^&*(),.?":{}|<>_]/.test(registerData.password) },
                  ].map((req, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.7rem',
                      color: req.met ? '#2ecc71' : (registerData.password ? '#e74c3c' : '#9f8ba8'),
                      transition: 'color 0.2s ease'
                    }}>
                      <i className={`bx ${req.met ? 'bx-check-circle' : 'bx-circle'}`} style={{ fontSize: '0.8rem' }}></i>
                      <span>{req.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="input-wrapper">
                <PasswordInput
                  id="reg-confirm-password"
                  placeholder="Confirm Password"
                  value={registerData.password_confirmation}
                  onChange={e => setRegisterData({ ...registerData, password_confirmation: e.target.value })}
                  required
                />
                {registerData.password_confirmation && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.7rem',
                    marginTop: '-4px',
                    paddingLeft: '4px',
                    color: registerData.password === registerData.password_confirmation ? '#2ecc71' : '#e74c3c'
                  }}>
                    <i className={`bx ${registerData.password === registerData.password_confirmation ? 'bx-check-circle' : 'bx-x-circle'}`}></i>
                    <span>{registerData.password === registerData.password_confirmation ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>
            </div>

            <button id="register-submit-btn" type="submit" className="btn">Create Account</button>
          </form>
        </div>

        {/* ─── Toggle Panel ─── */}
        <div className="toggle-box">
          <div className="toggle-panel toggle-left">
            <h2>Welcome Back!</h2>
            <p>Already part of Strand Up for Cancer?</p>
            <button type="button" className="btn login-btn" onClick={() => navigate('/login')}>Go to Login</button>
          </div>
          <div className="toggle-panel toggle-right">
            <h2>Hello, Welcome!</h2>
            <p>Don't have an account yet?</p>
            <button type="button" className="btn register-btn" onClick={() => navigate('/register')}>Go to Register</button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthPage;
