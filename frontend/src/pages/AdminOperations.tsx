import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';

const AdminOperations: React.FC = () => {
  const location = useLocation();
  const [view, setView] = useState<'production' | 'distribution'>('production');
  const [data, setData] = useState<{
    donations: any[];
    requests: any[];
    wigProductions: any[];
    stats: any;
  }>({
    donations: [],
    requests: [],
    wigProductions: [],
    stats: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v === 'production' || v === 'distribution') setView(v);
  }, [location.search]);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const [trackingRes, opsRes] = await Promise.all([
          apiClient.get('/internal-api/staff/realtime-tracking'),
          apiClient.get('/internal-api/admin/operations')
        ]);
        
        setData({
          donations: trackingRes.data.donations,
          requests: trackingRes.data.requests,
          wigProductions: Object.values(trackingRes.data.wigProductions),
          stats: opsRes.data
        });
      } catch (err: any) {
        console.error('Failed to fetch operational data', err);
        setError(err.response?.data?.message || 'Could not load operational tracking. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    fetchOps();
  }, []);

  if (loading) return <div className="section-wrap">Loading operational oversight...</div>;
  if (error) return <div className="section-wrap">Error: {error}</div>;
  if (!data || !data.stats) return <div className="section-wrap">Error: Could not load operational tracking. Please check your connection.</div>;

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Oversight</p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Operational Command</h1>
          <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Monitor real-time system throughput and workflow status.</p>
        </div>
      </header>

      {/* Oversight Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>In Production</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.stats?.activeWigTasks || 0}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>Ready for Match</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.stats?.pendingRequestsCount || 0}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>In Transit</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.stats?.transitCount || 0}</strong>
        </div>
        <div style={{ background: '#fff', border: '1px solid #ead7e8', padding: '0.8rem', borderRadius: '12px', textAlign: 'center' }}>
          <small style={{ display: 'block', color: '#8c7895', fontSize: '0.6rem', textTransform: 'uppercase' }}>Active Wigmakers</small>
          <strong style={{ fontSize: '1.2rem', color: '#ad246d' }}>{data.stats?.activeWigmakers || 0}</strong>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
          <div style={{ background: '#fdf7fb', padding: '0.4rem', borderRadius: '8px', border: '1px solid #ead7e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bx ${view === 'production' ? 'bxs-cog' : 'bxs-truck'}`} style={{ color: '#ad246d', fontSize: '1.25rem' }}></i>
          </div>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, color: '#3b2e43' }}>
            {view === 'production' ? 'Active Production Timeline' : 'Active Distribution & Delivery Log'}
          </h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Reference / ID</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>{view === 'production' ? 'Donor' : 'Recipient'}</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Current Status</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>{view === 'production' ? 'Processing Stage' : 'Delivery Info'}</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {view === 'production' ? (
              data.donations.map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                  <td style={{ padding: '0.75rem' }}><strong>{d.reference}</strong><br/><small style={{ color: '#8c7895' }}>Hair Batch</small></td>
                  <td style={{ padding: '0.75rem' }}>{d.user?.firstName} {d.user?.lastName}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 800,
                      background: d.status === 'Completed' ? '#ecfdf5' : '#fff7ed',
                      color: d.status === 'Completed' ? '#059669' : '#ea580c'
                    }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{d.status === 'In Progress' ? 'Wigmaker Partner' : 'System Inventory'}</td>
                  <td style={{ padding: '0.75rem', color: '#8c7895' }}>{new Date(d.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              data.requests.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f2ebf4' }}>
                  <td style={{ padding: '0.75rem' }}><strong>{r.reference}</strong><br/><small style={{ color: '#8c7895' }}>Wig Request</small></td>
                  <td style={{ padding: '0.75rem' }}>{r.user?.firstName} {r.user?.lastName}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 800,
                      background: r.status === 'Completed' ? '#ecfdf5' : '#eff6ff',
                      color: r.status === 'Completed' ? '#059669' : '#2563eb'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{r.status === 'In Transit' ? 'Out for Delivery' : 'In Fulfillment'}</td>
                  <td style={{ padding: '0.75rem', color: '#8c7895' }}>{new Date(r.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {((view === 'production' && data.donations.length === 0) || (view === 'distribution' && data.requests.length === 0)) && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8c7895' }}>
            <i className={`bx ${view === 'production' ? 'bx-layer' : 'bx-package'}`} style={{ fontSize: '2rem', opacity: 0.3 }}></i>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', fontWeight: 800 }}>
              {view === 'production' ? 'No Active Hair Batches in Production' : 'No Active Wig Deliveries in Progress'}
            </p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem' }}>
              {view === 'production' ? 'New production logs will appear here once hair is received.' : 'Distribution logs will appear here once wigs are matched.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminOperations;
