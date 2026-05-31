import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const shellStyles = `
.hl-auth-shell {
  min-height: 100vh;
  background: #FAFAF9;
  display: flex;
  flex-direction: column;
}

/* Nav - same as landing */
.hl-auth-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  background: rgba(250,250,249,0.92);
  border-bottom: 1px solid #EEEDE8;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.hl-auth-nav-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(20px,4vw,56px);
  height: 100%;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.hl-auth-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: #1C1917;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.hl-auth-logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.hl-auth-nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.hl-auth-nav-links a {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #57534E;
  text-decoration: none;
  transition: all 0.18s ease;
}

.hl-auth-nav-links a:hover {
  color: #1C1917;
  background: #F5F5F0;
}

.hl-auth-nav-divider {
  width: 1px;
  height: 20px;
  background: #EEEDE8;
  margin: 0 0.5rem;
}

.hl-auth-btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1.5px solid #D6D3CD;
  font-size: 0.875rem;
  font-weight: 600;
  color: #44403C;
  background: #fff;
  text-decoration: none;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.hl-auth-btn-ghost:hover,
.hl-auth-btn-ghost.active {
  border-color: #D63B8A;
  color: #D63B8A;
}

.hl-auth-btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ad246d;
  background: #fce4ec;
  border: 1.5px solid #f8bbd9;
  text-decoration: none;
  transition: all 0.18s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(214,59,138,.12);
}

.hl-auth-btn-primary:hover,
.hl-auth-btn-primary.active {
  background: #f48fb1;
  border-color: #f48fb1;
  color: #fff;
  box-shadow: 0 4px 14px rgba(214,59,138,.25);
  transform: translateY(-1px);
}

/* Burger */
.hl-auth-burger {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #EEEDE8;
  background: #fff;
  cursor: pointer;
  margin-left: auto;
}

.hl-auth-burger span {
  width: 18px;
  height: 2px;
  background: #57534E;
  border-radius: 2px;
  display: block;
}

.hl-auth-drawer {
  display: none;
  position: fixed;
  top: 64px; left: 0; right: 0;
  background: rgba(250,250,249,0.98);
  border-bottom: 1px solid #EEEDE8;
  padding: 1rem clamp(20px,4vw,56px) 1.5rem;
  z-index: 99;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 8px 24px rgba(28,25,23,.08);
}

.hl-auth-drawer.open { display: flex; }

.hl-auth-drawer a {
  padding: 0.7rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #57534E;
  text-decoration: none;
  transition: all 0.15s ease;
}

.hl-auth-drawer a:hover { background: #F5F5F0; color: #1C1917; }

/* Main content area */
.hl-auth-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 800px) {
  .hl-auth-nav-links { display: none; }
  .hl-auth-burger { display: flex; }
}
`;

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#FAFAF9';
    document.documentElement.style.background = '#FAFAF9';
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.background = '';
    };
  }, []);

  return (
    <div className="hl-auth-shell">
      <style>{shellStyles}</style>

      <header className="hl-auth-nav">
        <div className="hl-auth-nav-inner">
          <Link to="/" className="hl-auth-logo">
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink ribbon" />
            <span>HairLink</span>
          </Link>

          <nav className="hl-auth-nav-links">
            <Link to="/">Home</Link>
            <Link to="/#services">How It Works</Link>
            <Link to="/#about">About</Link>
            <Link to="/#contact">Contact</Link>
            <div className="hl-auth-nav-divider" />
            <Link
              to="/login"
              className={`hl-auth-btn-ghost ${isActive('/login') ? 'active' : ''}`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`hl-auth-btn-primary ${isActive('/register') ? 'active' : ''}`}
            >
              Register
            </Link>
          </nav>

          <button
            className="hl-auth-burger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>

        <div className={`hl-auth-drawer ${menuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/#services" onClick={() => setMenuOpen(false)}>How It Works</Link>
          <Link to="/#about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/#contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
          <Link
            to="/register"
            onClick={() => setMenuOpen(false)}
            style={{ color: '#ad246d', fontWeight: 600 }}
          >
            Register
          </Link>
        </div>
      </header>

      <main className="hl-auth-content">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
