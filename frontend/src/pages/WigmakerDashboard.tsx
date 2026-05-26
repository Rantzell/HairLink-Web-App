import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import '../styles/WigmakerDashboard.css';

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

  if (loading) return <div className="wigmaker-page staff-page">Loading workspace...</div>;

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

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
            { label: 'Total Tasks', value: tasks.length, icon: 'bx-briefcase-alt-2' },
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

      <article className="task-board dashboard-task-board">
        <div className="task-board-head dashboard-task-board-head">
          <h2 className="dashboard-task-board-title">Production Task Board</h2>
          <p className="dashboard-task-board-subtitle">Real-time tracking of assigned wig builds and donor material associations.</p>
        </div>

        <div className="task-filters dashboard-task-filters">
          {(['all', 'assigned', 'processing', 'completed'] as const).map(f => (
            <button 
              key={f}
              className={`filter-btn dashboard-filter-btn ${filter === f ? 'active' : ''}`} 
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="task-table-wrap dashboard-task-table-wrap">
          <table className="task-table dashboard-task-table">
            <thead>
              <tr className="dashboard-tr-head">
                <th className="dashboard-th">Task Details</th>
                <th className="dashboard-th">Status</th>
                <th className="dashboard-th">Timeline</th>
                <th className="dashboard-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <tr key={task.id} className="dashboard-tr-body">
                    <td className="dashboard-td">
                      <div className="dashboard-flex-gap">
                        <div className="dashboard-icon-container">
                          <i className="bx bx-package"></i>
                        </div>
                        <div>
                          <div className="dashboard-task-code">{task.taskCode}</div>
                          <div className="dashboard-task-ref">Ref: {task.donation?.reference || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="dashboard-td">
                      <StatusPill status={task.status} />
                    </td>
                    <td className="dashboard-td">
                      <div className="dashboard-timeline-col">
                        <span className="dashboard-timeline-started">Started: <strong className="dashboard-timeline-started-date">{new Date(task.createdAt).toLocaleDateString()}</strong></span>
                        <span className={`dashboard-timeline-target ${task.status === 'completed' ? 'completed' : ''}`}>
                          {task.status === 'completed' ? 'Finished: ' : 'Target: '}
                          <strong>{task.status === 'completed' ? (task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'N/A') : (task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A')}</strong>
                        </span>
                      </div>
                    </td>
                    <td className="dashboard-td">
                      <Link 
                        to={`/wigmaker/task/${task.taskCode} dashboard-open-task-btn`}
                      >
                        Open Task <i className="bx bx-chevron-right"></i>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="dashboard-empty-row">
                    <i className="bx bx-info-circle dashboard-empty-icon"></i>
                    <p className="dashboard-empty-text">No production tasks found.</p>
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
