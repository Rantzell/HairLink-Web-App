import React from 'react';

interface StatusPillProps {
  status: string;
  label?: string;
  className?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, label, className = '' }) => {
  const normalizedStatus = status ? String(status).toLowerCase().trim().replace(/\s+/g, '-') : 'unknown';
  
  // Map normalized status to the CSS classes defined in module CSS files
  const statusClass = `status-${normalizedStatus}`;

  return (
    <span className={`status-pill ${statusClass} ${className}`}>
      {label || (status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'Unknown')}
    </span>
  );
};

export default StatusPill;
