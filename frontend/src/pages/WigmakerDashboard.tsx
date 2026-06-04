import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import '../styles/WigmakerDashboard.css';

const WigmakerDashboard: React.FC = () => {
  const location = useLocation();
  const isProductionTasksPage = location.pathname.includes('production-tasks');
  const [stats, setStats] = useState({ total: 0, queued: 0, processing: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/internal-api/wigmaker/tasks');
        const tasks = res.data.tasks || [];
        setStats({
          total: tasks.length,
          queued: res.data.queuedCount ?? 0,
          processing: res.data.inProgressCount ?? 0,
          completed: res.data.completedCount ?? 0,
        });
      } catch (err) {
        console.error('Failed to fetch wigmaker tasks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (loading) return <div className="wigmaker-page staff-page">Loading workspace...</div>;

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div className="section-title-block dashboard-section-title-block">
        <h1 className="dashboard-title">
          {isProductionTasksPage ? 'Production Task Inventory' : 'Wigmaker Workspace'}
        </h1>
        <p className="dashboard-subtitle">
          {isProductionTasksPage 
            ? 'Detailed view of all active and completed wig builds.' 
            : 'Manage assigned wig production tasks and synchronize progress stages with staff.'}
        </p>
      </div>

      {!isProductionTasksPage && (
        <div className="status-cards dashboard-status-cards">
          {[
            { label: 'Total Tasks', value: stats.total, icon: 'bx-briefcase-alt-2' },
            { label: 'Queued', value: stats.queued, icon: 'bx-time-five' },
            { label: 'Processing', value: stats.processing, icon: 'bx-loader-circle' },
            { label: 'Completed', value: stats.completed, icon: 'bx-check-double' }
          ].map((card, idx) => (
            <article key={idx} className="status-card dashboard-status-card">
              <h2 className="dashboard-status-value">{card.value}</h2>
              <p className="dashboard-status-label">{card.label}</p>
              <i className={`bx ${card.icon} dashboard-status-icon`}></i>
            </article>
          ))}
        </div>
      )}

      {!isProductionTasksPage && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          <Link to="/wigmaker/profile" style={{
            background: '#ffffff',
            border: '1px solid #EEEDE8',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(28, 25, 23, 0.01)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#FFF0F8',
                color: '#D63B8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                <i className="bx bx-user"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: '#44403C' }}>My Profile</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716C' }}>Manage your personal details and upload new photo</p>
              </div>
            </div>
            <i className="bx bx-chevron-right" style={{ color: '#A8A29E', fontSize: '1.2rem' }}></i>
          </Link>
        </div>
      )}

    </section>
  );
};

export default WigmakerDashboard;
