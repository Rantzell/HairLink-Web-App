import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import type { WigProduction } from '../types';
import StatusPill from '../components/StatusPill';

// Demo Data for Visualization - REMOVED
const DEMO_TASKS: any[] = [];

const WigmakerDashboard: React.FC = () => {
  const location = useLocation();
  const isProductionTasksPage = location.pathname.includes('production-tasks');
  const [tasks, setTasks] = useState<any[]>(DEMO_TASKS);
  const [stats, setStats] = useState({ queued: 0, processing: 0, completed: 0 });
  const [filter, setFilter] = useState<'all' | 'assigned' | 'processing' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/internal-api/wigmaker/tasks');
        if (res.data.tasks && res.data.tasks.length > 0) {
          setTasks(res.data.tasks);
          setStats({
            queued: res.data.queuedCount,
            processing: res.data.inProgressCount,
            completed: res.data.completedCount
          });
        }
      } catch (err) {
        console.error('Failed to fetch wigmaker tasks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  return (
    <section className="wigmaker-page reveal active staff-page">
      <div className="section-title-block" style={{ marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>
          {isProductionTasksPage ? 'Production Task Inventory' : 'Wigmaker Workspace'}
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#8c7895', marginTop: '0.2rem' }}>
          {isProductionTasksPage 
            ? 'Detailed view of all active and completed wig builds.' 
            : 'Manage assigned wig production tasks and synchronize progress stages with staff.'}
        </p>
      </div>

      {!isProductionTasksPage && (
        <div className="status-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Tasks', value: tasks.length, icon: 'bx-briefcase-alt-2' },
            { label: 'Queued', value: stats.queued, icon: 'bx-time-five' },
            { label: 'Processing', value: stats.processing, icon: 'bx-loader-circle' },
            { label: 'Completed', value: stats.completed, icon: 'bx-check-double' }
          ].map((card, idx) => (
            <article key={idx} className="status-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1rem', position: 'relative', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ad246d', margin: 0 }}>{card.value}</h2>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8c7895', margin: '0.2rem 0 0 0', textTransform: 'uppercase' }}>{card.label}</p>
              <i className={`bx ${card.icon}`} style={{ position: 'absolute', right: '0.8rem', bottom: '0.8rem', fontSize: '1.6rem', opacity: 0.05, color: '#ad246d' }}></i>
            </article>
          ))}
        </div>
      )}

      <article className="task-board" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div className="task-board-head" style={{ marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Production Task Board</h2>
          <p style={{ fontSize: '0.75rem', color: '#8c7895', marginTop: '0.2rem' }}>Real-time tracking of assigned wig builds and donor material associations.</p>
        </div>

        <div className="task-filters" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'assigned', 'processing', 'completed'] as const).map(f => (
            <button 
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`} 
              onClick={() => setFilter(f)}
              style={{ 
                height: '32px', 
                padding: '0 1.2rem', 
                borderRadius: '8px', 
                border: filter === f ? 'none' : '1px solid #ead7e8', 
                background: filter === f ? '#ad246d' : '#fff', 
                color: filter === f ? '#fff' : (filter === 'all' && f === 'all' ? '#fff' : '#ad246d'),
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="task-table-wrap" style={{ border: '1px solid #ead7e8', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Details</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timeline</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #ead7e8', transition: 'background 0.2s ease' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fdf7fb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ad246d', border: '1px solid #ead7e8' }}>
                          <i className='bx bx-package' style={{ fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#3b2e43' }}>{task.taskCode}</div>
                          <div style={{ fontSize: '0.7rem', color: '#8c7895' }}>Ref: {task.donation?.reference || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusPill status={task.status} />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                        <span style={{ color: '#8c7895' }}>Started: <strong style={{ color: '#5d4d62' }}>{new Date(task.createdAt).toLocaleDateString()}</strong></span>
                        <span style={{ color: task.status === 'completed' ? '#28a745' : '#ad246d' }}>
                          {task.status === 'completed' ? 'Finished: ' : 'Target: '}
                          <strong style={{ fontWeight: 800 }}>{task.status === 'completed' ? (task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'N/A') : (task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A')}</strong>
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link 
                        to={`/wigmaker/task/${task.taskCode}`}
                        style={{ height: '32px', padding: '0 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', border: '1px solid #ead7e8', color: '#ad246d', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', background: '#fff' }}
                      >
                        Open Task <i className='bx bx-chevron-right' style={{ fontSize: '1rem' }}></i>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#8c7895' }}>
                    <i className='bx bx-info-circle' style={{ fontSize: '2rem', marginBottom: '0.8rem', display: 'block', opacity: 0.3 }}></i>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>No production tasks found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default WigmakerDashboard;
