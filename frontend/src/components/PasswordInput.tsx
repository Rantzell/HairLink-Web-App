import React, { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  placeholder?: string;
  error?: string[];
  iconClass?: string;
}

/**
 * Reusable Password Input with visibility toggle.
 * Uses warm neutral design tokens via CSS variables.
 */
const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  placeholder = 'Password',
  error,
  iconClass = 'bxs-lock-alt',
  className,
  style,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`input-wrapper ${className || ''}`} style={{ position: 'relative' }}>
      <div className="input-box" style={{ position: 'relative' }}>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          style={{
            paddingRight: '3rem',
            ...style,
          }}
          {...props}
        />

        {/* Toggle visibility */}
        <i
          className={`bx ${showPassword ? 'bx-hide' : 'bx-show'}`}
          onClick={() => setShowPassword(v => !v)}
          title={showPassword ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '2.2rem',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            color: '#A8A29E',
            fontSize: '1rem',
            zIndex: 10,
            transition: 'color 0.15s',
          }}
        />

        {/* Lock icon */}
        <i
          className={`bx ${iconClass}`}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#A8A29E',
            fontSize: '0.95rem',
            pointerEvents: 'none',
          }}
        />
      </div>

      {error && error.length > 0 && (
        <div
          className="ajax-error"
          style={{
            display: 'block',
            marginTop: '4px',
            fontSize: '0.72rem',
            color: '#B45454',
          }}
        >
          {error[0]}
        </div>
      )}
    </div>
  );
};

export default PasswordInput;
