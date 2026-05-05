import React, { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  placeholder?: string;
  error?: string[];
  iconClass?: string;
}

/**
 * Reusable Password Input with Visibility Toggle and Glassmorphism aesthetics.
 */
const PasswordInput: React.FC<PasswordInputProps> = ({ 
  id, 
  placeholder = "Password", 
  error, 
  iconClass = "bxs-lock-alt", 
  className,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => setShowPassword(!showPassword);

  return (
    <div className={`input-wrapper ${className || ''}`}>
      <div className="input-box" style={{ position: 'relative' }}>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          style={{
            paddingRight: '3rem', // Make room for both icons
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(232, 216, 232, 0.8)',
          }}
          {...props}
        />
        
        {/* Toggle Icon */}
        <i 
          className={`bx ${showPassword ? 'bx-hide' : 'bx-show'} password-toggle`} 
          onClick={toggleVisibility}
          style={{
            position: 'absolute',
            right: '2.2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: '#9f8ba8',
            zIndex: 10,
            fontSize: '1.1rem',
            transition: 'color 0.2s ease'
          }}
          title={showPassword ? "Hide password" : "Show password"}
        />

        {/* Lock Icon */}
        <i 
          className={`bx ${iconClass}`}
          style={{
            position: 'absolute',
            right: '0.8rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9f8ba8',
            pointerEvents: 'none'
          }}
        />
      </div>
      {error && error.length > 0 && (
        <div className="ajax-error" style={{ display: 'block', marginTop: '4px' }}>
          {error[0]}
        </div>
      )}
    </div>
  );
};

export default PasswordInput;
