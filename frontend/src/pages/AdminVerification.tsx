import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const AdminVerification: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<'donor' | 'recipient' | 'monetary'>('donor');
  const [data, setData] = useState<{
    donor: any[];
    recipient: any[];
    monetary: any[];
  }>({
    donor: [],
    recipient: [],
    monetary: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'donor' || v === 'recipient' || v === 'monetary') setView(v as any);
  }, [location.search]);

  useEffect(() => {
    const fetchAllQueues = async () => {
      try {
        const [donorRes, recipientRes, monetaryRes] = await Promise.all([
          apiClient.get('/internal-api/staff/donor-verification'),
          apiClient.get('/internal-api/staff/recipient-verification'),
          apiClient.get('/internal-api/staff/monetary-verification')
        ]);
        
        setData({
          donor: donorRes.data,
          recipient: recipientRes.data,
          monetary: monetaryRes.data
        });
      } catch (err) {
        console.error('Failed to fetch verification queues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllQueues();
  }, []);

  if (loading) return <div className="section-wrap">Aggregating verification queues...</div>;

  const currentItems = data[view];

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Oversight</p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Verification Oversight</h1>
          <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Monitor the status of donor and recipient verification queues.</p>
        </div>
      </header>

      {/* Queue Health Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>Donor Pending</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.donor.filter(i => i.status === 'Pending').length}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>Recipient Pending</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.recipient.filter(i => i.status === 'Pending').length}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>Monetary Pending</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.monetary.filter(i => i.status === 'Pending').length}</strong>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#fdf7fb', padding: '0.4rem', borderRadius: '8px', border: '1px solid #ead7e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bx ${view === 'donor' ? 'bx-cut' : view === 'recipient' ? 'bx-heart' : 'bx-donate-heart'}`} style={{ color: '#ad246d', fontSize: '1.25rem' }}></i>
          </div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, color: '#3b2e43' }}>
            {view === 'donor' ? 'Hair Donation Verification Queue' : view === 'recipient' ? 'Recipient Request Verification Queue' : 'Monetary Contribution Verification Queue'}
          </h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Reference</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Submission Date</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>User / Participant</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Verification Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Admin Note</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                <td style={{ padding: '0.75rem' }}><strong>{item.reference || item.reference_number}</strong></td>
                <td style={{ padding: '0.75rem', color: '#8c7895' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem' }}>{item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}</td>
                <td style={{ padding: '0.75rem' }}><StatusPill status={item.status} /></td>
                <td style={{ padding: '0.75rem', color: '#8c7895', fontSize: '0.7rem' }}>
                  {item.status === 'Pending' ? 'Awaiting staff review' : `Verified on ${new Date(item.updatedAt).toLocaleDateString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {currentItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8c7895' }}>
            <i className='bx bx-check-shield' style={{ fontSize: '2rem', opacity: 0.3 }}></i>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', fontWeight: 800 }}>Queue Clear</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem' }}>No verification requests in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminVerification;
