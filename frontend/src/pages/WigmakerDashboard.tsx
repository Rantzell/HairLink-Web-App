import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { WigProduction } from '../types';
import StatusPill from '../components/StatusPill';

const WigmakerDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<WigProduction[]>([]);
  const [stats, setStats] = useState({ queued: 0, processing: 0, completed: 0 });
  const [filter, setFilter] = useState<'all' | 'assigned' | 'processing' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await apiClient.get('/internal-api/wigmaker/tasks');
        setTasks(res.data.tasks);
        setStats({
          queued: res.data.queuedCount,
          processing: res.data.inProgressCount,
          completed: res.data.completedCount
        });
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
    <section className="section-wrap reveal active wigmaker-page">
      <div className="section-title-block">
        <h1>Partner Wigmaker Workspace</h1>
        <p>Manage assigned wig production tasks and update progress stages for staff and admin monitoring.</p>
      </div>

      <div className="status-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <article className="status-card" style={{ textAlign: 'center', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ead7e8' }}>
          <h2 style={{ color: '#ad246d', fontSize: '2rem' }}>{loading ? '...' : tasks.length}</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>Total Tasks</p>
        </article>
        <article className="status-card" style={{ textAlign: 'center', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ead7e8' }}>
          <h2 style={{ color: '#ad246d', fontSize: '2rem' }}>{loading ? '...' : stats.queued}</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>Queued</p>
        </article>
        <article className="status-card" style={{ textAlign: 'center', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ead7e8' }}>
          <h2 style={{ color: '#ad246d', fontSize: '2rem' }}>{loading ? '...' : stats.processing}</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>In Progress</p>
        </article>
        <article className="status-card" style={{ textAlign: 'center', background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #ead7e8' }}>
          <h2 style={{ color: '#ad246d', fontSize: '2rem' }}>{loading ? '...' : stats.completed}</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>Completed</p>
        </article>
      </div>

      <article className="task-board" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1.5rem' }}>
        <div className="task-board-head" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Production Tasks</h2>
          <p style={{ margin: 0, color: '#8c7895', fontSize: '0.9rem' }}>Every status update notifies relevant staff and administrators.</p>
        </div>

        <div className="task-filters" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['all', 'assigned', 'processing', 'completed'] as const).map(f => (
            <button 
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`} 
              onClick={() => setFilter(f)}
              style={{ padding: '0.4rem 1.2rem', borderRadius: '8px', border: '1px solid #ead7e8', background: filter === f ? '#ad246d' : '#fff', color: filter === f ? '#fff' : '#4d3f56', fontWeight: 700 }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Loading tasks...</td></tr>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td><strong>{task.taskCode}</strong></td>
                    <td><StatusPill status={task.status} /></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#8c7895' }}>Start: <strong>{new Date(task.createdAt).toLocaleDateString()}</strong></span>
                        <span style={{ color: task.status === 'completed' ? '#28a745' : '#7f2958' }}>
                          {task.status === 'completed' ? 'Done' : 'Due'}: <strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</strong>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link className="ghost-btn" to={`/wigmaker/task/${task.taskCode}`} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Open Task</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No tasks found for this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default WigmakerDashboard;
