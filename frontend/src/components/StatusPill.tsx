import React from 'react';

interface StatusPillProps {
  status: string;
  className?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const normalizedStatus = status.toLowerCase().trim().replace(/\s+/g, '-');
  
  // Map normalized status to the CSS classes defined in module CSS files
  const statusClass = `status-${normalizedStatus}`;

  return (
    <span className={`status-pill ${statusClass} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusPill;
