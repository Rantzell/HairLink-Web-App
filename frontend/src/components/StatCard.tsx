import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  type?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, type = 'default' }) => {
  return (
    <article className={`admin-stat admin-stat-${type}`}>
      <span className="admin-stat-accent"></span>
      
      <div className="stat-header">
        {icon && <i className={`fa-solid ${icon}`}></i>}
        <span className="stat-title">{title}</span>
      </div>
      
      <h2 className="stat-value">{value}</h2>
      
      {subtitle && <p className="stat-subtitle">{subtitle}</p>}
    </article>
  );
};

export default StatCard;
