import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const AdminEvents: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', description: '', location: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/internal-api/admin/events');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/admin/events', {
        event_title: form.title,
        event_date: form.date,
        event_description: form.description,
        event_location: form.location
      });
      setForm({ title: '', date: '', description: '', location: '' });
      fetchEvents();
    } catch (err) {
      console.error('Failed to save event', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading events...</div>;

  return (
    <section className="section-wrap reveal active admin-page">
      <header className="admin-page-header">
        <p className="admin-page-kicker">Admin · Events</p>
        <h1 className="admin-page-title">Update Events</h1>
        <p className="admin-page-subtitle">Schedule and publish HairLink community events and donation drives.</p>
      </header>

      <article className="admin-card admin-card-rounded-mb">
        <h2 className="admin-card-title-sm"><i className="bx bx-calendar-plus admin-icon-pink"></i> Add New Event</h2>
        <form onSubmit={handleSubmit} className="admin-form-grid">
          <div className="admin-two-col-grid">
            <div className="form-group">
              <label className="admin-form-label">Event Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Donation Drive" required />
            </div>
            <div className="form-group">
              <label className="admin-form-label">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label className="admin-form-label">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Event details..."></textarea>
          </div>
          <div className="form-group">
            <label className="admin-form-label">Location</label>
            <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Venue..." />
          </div>
          <div className="admin-btn-row">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="admin-btn-primary"
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </button>
            <button 
              type="reset" 
              onClick={() => setForm({title: '', date: '', description: '', location: ''})}
              className="admin-btn-ghost"
            >
              Clear
            </button>
          </div>
        </form>
      </article>

      <div className="admin-two-col-grid-2rem">
        <article className="admin-card admin-card-rounded">
          <h2 className="admin-card-title-xs"><i className="bx bx-calendar-event admin-icon-pink"></i> Upcoming</h2>
          <div className="event-list admin-form-grid">
            {data.upcomingEvents.map((ev: any) => (
              <div key={ev.id} className="event-item admin-event-item">
                <div className="admin-event-date-badge">
                  <div className="admin-event-date-day">{new Date(ev.date).getDate()}</div>
                  <div className="admin-event-date-month">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div>
                  <h4 className="admin-event-title">{ev.title}</h4>
                  <p className="admin-event-meta">{ev.location}</p>
                </div>
              </div>
            ))}
            {data.upcomingEvents.length === 0 && <p className="admin-event-empty">No upcoming events.</p>}
          </div>
        </article>

        <article className="admin-card admin-card-rounded">
          <h2 className="admin-card-title-xs"><i className="bx bx-history admin-icon-pink"></i> Past Events</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {data.pastEvents.map((ev: any) => (
                  <tr key={ev.id}>
                    <td><strong>{ev.title}</strong></td>
                    <td>{new Date(ev.date).toLocaleDateString()}</td>
                    <td>{ev.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title="Publish Event"
        message={`Publish "${form.title}" scheduled on ${form.date ? new Date(form.date).toLocaleDateString() : ''}? This will appear on the public HairLink events page.`}
        confirmText="Yes, Publish Event"
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default AdminEvents;
