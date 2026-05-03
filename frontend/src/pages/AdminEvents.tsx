import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const AdminEvents: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', description: '', location: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
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
      <header style={{ padding: '0.6rem 0 0.2rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.2rem' }}>Admin · Events</p>
        <h1 style={{ fontSize: '2.1rem', color: '#261d2b', margin: 0 }}>Update Events</h1>
        <p style={{ color: '#665772', fontSize: '0.88rem', marginTop: '0.25rem' }}>Schedule and publish HairLink community events and donation drives.</p>
      </header>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1.5rem 0' }}><i className='bx bx-calendar-plus' style={{ color: '#ad246d' }}></i> Add New Event</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Event Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Donation Drive" required />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Event details..."></textarea>
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Location</label>
            <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Venue..." />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="soft-btn" type="submit" disabled={isSubmitting}>Save Event</button>
            <button className="ghost-btn" type="reset" onClick={() => setForm({title: '', date: '', description: '', location: ''})}>Clear</button>
          </div>
        </form>
      </article>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0' }}><i className='bx bx-calendar-event' style={{ color: '#ad246d' }}></i> Upcoming</h2>
          <div className="event-list" style={{ display: 'grid', gap: '1rem' }}>
            {data.upcomingEvents.map((ev: any) => (
              <div key={ev.id} className="event-item" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fdf7fb', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', background: '#ad246d', color: '#fff', padding: '0.5rem', borderRadius: '8px', minWidth: '50px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{new Date(ev.date).getDate()}</div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0' }}>{ev.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8c7895' }}>{ev.location}</p>
                </div>
              </div>
            ))}
            {data.upcomingEvents.length === 0 && <p style={{ textAlign: 'center', color: '#8c7895' }}>No upcoming events.</p>}
          </div>
        </article>

        <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0' }}><i className='bx bx-history' style={{ color: '#ad246d' }}></i> Past Events</h2>
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
    </section>
  );
};

export default AdminEvents;
