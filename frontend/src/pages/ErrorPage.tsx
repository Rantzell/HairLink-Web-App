import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ErrorPageProps {
  code: 401 | 403 | 404;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ code }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic content depending on the error code
  const contentMap = {
    401: {
      title: 'Unauthorized Access',
      message: 'You need to be logged in to access this page. Please sign in to continue.',
      icon: 'bx-log-in-circle',
      primaryAction: { label: 'Go to Login', path: '/login' }
    },
    403: {
      title: 'Access Forbidden',
      message: "Sorry, you don't have permission to access this area. If you believe this is an error, please contact support.",
      icon: 'bx-shield-quarter',
      primaryAction: user 
        ? { label: 'Go to Dashboard', path: `/${user.role}/dashboard` }
        : { label: 'Back to Home', path: '/' }
    },
    404: {
      title: 'Page Not Found',
      message: "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
      icon: 'bx-sad',
      primaryAction: user
        ? { label: 'Go to Dashboard', path: `/${user.role}/dashboard` }
        : { label: 'Back to Home', path: '/' }
    }
  };

  const currentContent = contentMap[code] || contentMap[404];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, #fdf5f7 0%, #f7e6f3 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '2rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background blobs */}
      <div style={{
        position: 'absolute', width: '300px', height: '300px',
        background: 'rgba(255, 107, 129, 0.08)', borderRadius: '50%',
        top: '-50px', left: '-50px', filter: 'blur(50px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'rgba(173, 36, 109, 0.06)', borderRadius: '50%',
        bottom: '-100px', right: '-100px', filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        maxWidth: '540px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(73, 20, 52, 0.05)',
        animation: 'errorSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        position: 'relative',
        zIndex: 1
      }}>
        <style>{`
          @keyframes errorSlideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes floatIcon {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }
          .floating-icon {
            animation: floatIcon 3.5s ease-in-out infinite;
          }
          .error-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(173, 36, 109, 0.25) !important;
          }
          .error-action-btn:active {
            transform: translateY(0);
          }
          .error-back-btn:hover {
            background: rgba(173, 36, 109, 0.05) !important;
            color: #8c1e58 !important;
          }
        `}</style>

        {/* Large Decorative Icon */}
        <div className="floating-icon" style={{
          fontSize: '5rem',
          color: '#ad246d',
          background: 'linear-gradient(135deg, #ad246d 0%, #ff6b81 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          display: 'inline-block'
        }}>
          <i className={`bx ${currentContent.icon}`}></i>
        </div>

        {/* Huge Status Code */}
        <h1 style={{
          fontSize: '6.5rem',
          fontWeight: 900,
          margin: '0 0 1rem 0',
          lineHeight: '1',
          background: 'linear-gradient(135deg, #3b2e43 30%, #ad246d 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px'
        }}>
          {code}
        </h1>

        {/* Error Info */}
        <h2 style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: '#3b2e43',
          margin: '0 0 0.75rem 0'
        }}>
          {currentContent.title}
        </h2>
        <p style={{
          fontSize: '0.95rem',
          color: '#6e5a75',
          lineHeight: '1.6',
          margin: '0 0 2rem 0',
          padding: '0 1rem'
        }}>
          {currentContent.message}
        </p>

        {/* Actions Button Group */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {code !== 401 && (
            <button
              onClick={() => navigate(-1)}
              className="error-back-btn"
              style={{
                padding: '0.75rem 1.75rem',
                borderRadius: '12px',
                border: '1.5px solid #ead7e8',
                background: '#transparent',
                color: '#ad246d',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="bx bx-arrow-back"></i> Go Back
            </button>
          )}

          <Link
            to={currentContent.primaryAction.path}
            className="error-action-btn"
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ad246d 0%, #ff6b81 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 14px rgba(173, 36, 109, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {currentContent.primaryAction.label}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
