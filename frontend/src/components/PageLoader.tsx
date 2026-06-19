import React from 'react';

interface PageLoaderProps {
  message?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1.5rem',
      padding: '2rem',
    }}>
      {/* Spinner ring */}
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '4px solid #f3e6f0',
          borderTopColor: '#D63B8A',
          animation: 'hlSpinnerRotate 0.8s linear infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: '10px',
          borderRadius: '50%',
          border: '3px solid #fce4ec',
          borderBottomColor: '#ad246d',
          animation: 'hlSpinnerRotate 1.2s linear infinite reverse',
        }} />
      </div>

      {/* Message */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: 0,
          fontSize: '0.95rem',
          fontWeight: 600,
          color: '#4a3452',
          letterSpacing: '0.01em',
        }}>
          {message}
        </p>
        <p style={{
          margin: '0.35rem 0 0',
          fontSize: '0.78rem',
          color: '#9b89a8',
        }}>
          Please wait a moment
        </p>
      </div>

      {/* Dot pulse bar */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#D63B8A',
            display: 'inline-block',
            animation: `hlDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            opacity: 0.3,
          }} />
        ))}
      </div>
    </div>
  );
};

export default PageLoader;
