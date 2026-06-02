import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

/** Returns today's datetime in YYYY-MM-DDTHH:mm format for min attribute */
function todayMin(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const AdminEvents: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', description: '', location: '' });
  const [editingEvent, setEditingEvent] = useState<any>(null);
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
    if (new Date(form.date) < new Date()) {
      toast.error('Event date cannot be in the past. Please select a future date and time.');
      return;
    }
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    try {
      const payload = {
        event_title: form.title,
        event_date: form.date,
        event_description: form.description,
        event_location: form.location
      };

      if (editingEvent) {
        await apiClient.put(`/internal-api/admin/events/${editingEvent.id}`, payload);
      } else {
        await apiClient.post('/internal-api/admin/events', payload);
      }

      setForm({ title: '', date: '', description: '', location: '' });
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Failed to save event', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatForDateTimeLocal = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString();
    return localISOTime.substring(0, 16);
  };

  const handleEdit = (ev: any) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title,
      date: formatForDateTimeLocal(ev.date),
      description: ev.description || '',
      location: ev.location || ''
    });
    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    setForm({ title: '', date: '', description: '', location: '' });
    setEditingEvent(null);
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
        <h2 className="admin-card-title-sm">
          <i className="bx bx-calendar-plus admin-icon-pink"></i> {editingEvent ? 'Edit Event' : 'Add New Event'}
        </h2>
        <form onSubmit={handleSubmit} className="admin-form-grid">
          <div className="admin-two-col-grid">
            <div className="form-group">
              <label className="admin-form-label">Event Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Donation Drive" required />
            </div>
            <div className="form-group">
              <label className="admin-form-label">Date & Time *</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm({...form, date: e.target.value})} min={todayMin()} required />
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
              {isSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Save Event'}
            </button>
            <button 
              type="button" 
              onClick={handleClear}
              className="admin-btn-ghost"
            >
              {editingEvent ? 'Cancel Edit' : 'Clear'}
            </button>
          </div>
        </form>
      </article>

      <div className="admin-two-col-grid-2rem">
        <article className="admin-card admin-card-rounded">
          <h2 className="admin-card-title-xs"><i className="bx bx-calendar-event admin-icon-pink"></i> Upcoming</h2>
          <div className="event-list admin-form-grid">
            {data.upcomingEvents.map((ev: any) => (
              <div key={ev.id} className="event-item admin-event-item" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="admin-event-date-badge">
                  <div className="admin-event-date-day">{new Date(ev.date).getDate()}</div>
                  <div className="admin-event-date-month">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                  <div>
                    <h4 className="admin-event-title">{ev.title}</h4>
                    <p className="admin-event-meta">{ev.location} · {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button className="admin-btn-ghost" style={{ padding: '6px', minWidth: 'auto', border: 'none', background: 'transparent' }} onClick={() => handleEdit(ev)} title="Edit Event">
                    <i className="bx bx-edit admin-icon-pink" style={{ fontSize: '1.2rem', cursor: 'pointer' }}></i>
                  </button>
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
                  <th>Date & Time</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.pastEvents.map((ev: any) => (
                  <tr key={ev.id}>
                    <td><strong>{ev.title}</strong></td>
                    <td>{new Date(ev.date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{ev.location}</td>
                    <td>
                      <button 
                        className="admin-btn-ghost" 
                        style={{ padding: '4px 8px', minWidth: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                        onClick={() => handleEdit(ev)}
                      >
                        <i className="bx bx-edit admin-icon-pink"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {data.pastEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center" style={{ color: '#8c7895', padding: '20px' }}>No past events.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmit}
        title={editingEvent ? "Update Event" : "Publish Event"}
        message={editingEvent 
          ? `Save modifications for event "${form.title}"? Changes will be immediately reflected on the public landing page.` 
          : `Publish "${form.title}" scheduled on ${form.date ? new Date(form.date).toLocaleString() : ''}? This will appear on the public HairLink events page.`}
        confirmText={editingEvent ? "Yes, Save Changes" : "Yes, Publish Event"}
        isConfirming={isSubmitting}
      />
    </section>
  );
};

export default AdminEvents;
