import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { calculateCompatibility } from './StaffMatching';

const AdminMatching: React.FC = () => {
  const [data, setData] = useState<{
    recipients: any[];
    wigs: any[];
  }>({
    recipients: [],
    wigs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatching = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/rule-matching');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch matching oversight data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatching();
  }, []);

  if (loading) return <div className="section-wrap">Loading matching oversight...</div>;

  // Analysis Logic
  const pendingRequests = data.recipients.length;
  const availableWigs = data.wigs.length;
  
  // Find Perfect Matches (≥ 90%)
  const highMatchOpportunities = data.recipients.map(r => {
    const bestWig = data.wigs
      .map(w => ({ ...w, score: calculateCompatibility(r, w) }))
      .sort((a, b) => b.score - a.score)[0];
    return { recipient: r, bestWig, score: bestWig?.score || 0 };
  }).filter(o => o.score >= 90);

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Oversight</p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Matching Oversight</h1>
          <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Audit the recipient waitlist and inventory allocation throughput.</p>
        </div>

        <div style={{ background: '#fdf7fb', padding: '0.35rem 0.9rem', borderRadius: '50px', border: '1px solid #ead7e8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', background: '#ad246d', borderRadius: '50%' }}></span>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' }}>{pendingRequests} PENDING RECIPIENTS</span>
        </div>
      </header>

      {/* Allocation Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fdf7fb', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='bx bx-user-voice' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', fontWeight: 700 }}>WAITLIST SIZE</small>
            <strong style={{ fontSize: '1.2rem', color: '#261d2b' }}>{pendingRequests} Recipients</strong>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fdf7fb', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='bx bx-shopping-bag' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', fontWeight: 700 }}>UNALLOCATED WIGS</small>
            <strong style={{ fontSize: '1.2rem', color: '#261d2b' }}>{availableWigs} Available</strong>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#fdf7fb', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='bx bx-check-double' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.65rem', fontWeight: 700 }}>PERFECT MATCHES</small>
            <strong style={{ fontSize: '1.2rem', color: '#261d2b' }}>{highMatchOpportunities.length} Ready</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Waitlist Audit */}
        <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className='bx bx-list-ul' style={{ color: '#ad246d' }}></i> Recipient Waitlist Audit
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem' }}>Recipient</th>
                <th style={{ textAlign: 'left', padding: '0.6rem' }}>Spec Requested</th>
                <th style={{ textAlign: 'left', padding: '0.6rem' }}>Wait Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                  <td style={{ padding: '0.6rem' }}><strong>{r.user?.firstName} {r.user?.lastName}</strong></td>
                  <td style={{ padding: '0.6rem' }}>{r.wigLength} / {r.wigColor}</td>
                  <td style={{ padding: '0.6rem', color: '#8c7895' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recipients.length === 0 && <p style={{ textAlign: 'center', padding: '2rem', color: '#8c7895', fontSize: '0.8rem' }}>Waitlist is empty.</p>}
        </div>

        {/* Right: High-Match Opportunities */}
        <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className='bx bx-sparkles' style={{ color: '#ad246d' }}></i> Top Match Opportunities
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {highMatchOpportunities.map((o: any, idx: number) => (
              <div key={idx} style={{ background: '#fdf7fb', padding: '0.8rem', borderRadius: '12px', border: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.8rem', display: 'block' }}>{o.recipient.user?.firstName} {o.recipient.user?.lastName}</strong>
                  <small style={{ color: '#8c7895' }}>Matched with Stock #{o.bestWig.taskCode}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: '#28a745' }}>{o.score}%</span>
                  <small style={{ display: 'block', fontSize: '0.6rem', color: '#8c7895', fontWeight: 800 }}>COMPATIBILITY</small>
                </div>
              </div>
            ))}
            {highMatchOpportunities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8c7895', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ead7e8' }}>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>No high-match opportunities found.</p>
                <small>Available inventory does not yet perfectly meet waitlist specs.</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminMatching;
