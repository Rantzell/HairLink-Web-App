import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isConfirming?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  isConfirming = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmBg = variant === 'danger'
    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
    : 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)';

  const modal = (
    <div
      id="confirm-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(30, 18, 36, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'cmFadeIn 0.18s ease',
      }}
    >
      <style>{`
        @keyframes cmFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        #confirm-modal-card { animation: cmSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
        #confirm-modal-cancel:hover { background: #f3e8f0 !important; }
        #confirm-modal-confirm:hover { opacity: 0.88; }
      `}</style>

      <div
        id="confirm-modal-card"
        style={{
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(173, 36, 109, 0.18), 0 8px 24px rgba(0,0,0,0.12)',
          padding: '2rem',
          maxWidth: '420px',
          width: '100%',
          border: '1px solid #ead7e8',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: variant === 'danger' ? '#fef2f2' : '#fdf2f8',
            display: 'grid', placeItems: 'center',
            border: `2px solid ${variant === 'danger' ? '#fecaca' : '#f9cde8'}`,
          }}>
            <i
              className={variant === 'danger' ? 'bx bx-error-circle' : 'bx bx-check-shield'}
              style={{ fontSize: '1.75rem', color: variant === 'danger' ? '#dc2626' : '#ad246d' }}
            />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          textAlign: 'center', margin: '0 0 0.5rem 0',
          fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43',
        }}>
          {title}
        </h2>

        {/* Message */}
        <p style={{
          textAlign: 'center', margin: '0 0 1.75rem 0',
          fontSize: '0.875rem', color: '#8c7895', lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            id="confirm-modal-cancel"
            onClick={onClose}
            disabled={isConfirming}
            style={{
              height: '44px', borderRadius: '50px',
              border: '1.5px solid #ead7e8', background: '#fff',
              color: '#5d4d62', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            {cancelText}
          </button>
          <button
            id="confirm-modal-confirm"
            onClick={onConfirm}
            disabled={isConfirming}
            style={{
              height: '44px', borderRadius: '50px',
              border: 'none', background: confirmBg,
              color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              cursor: isConfirming ? 'not-allowed' : 'pointer',
              opacity: isConfirming ? 0.75 : 1,
              transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {isConfirming ? (
              <>
                <i className="bx bx-loader-alt" style={{ animation: 'spin 0.8s linear infinite' }} />
                Processing...
              </>
            ) : confirmText}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ConfirmModal;
