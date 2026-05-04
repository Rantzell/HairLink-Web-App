import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const AdminInventory: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview'); 
  const [wigFilter, setWigFilter] = useState('');
  const [donFilter, setDonFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v) setView(v);
  }, [location.search]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await apiClient.get('/internal-api/admin/inventory');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch inventory', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  if (loading) return <div className="section-wrap">Loading inventory oversight...</div>;
  if (!data) return <div className="section-wrap">Error: Could not load inventory data. Please try again.</div>;

  const filteredWigs = (data.wigStock as any[]).filter(w => 
    w.taskCode.toLowerCase().includes(wigFilter.toLowerCase()) ||
    `${w.wigmaker?.firstName} ${w.wigmaker?.lastName}`.toLowerCase().includes(wigFilter.toLowerCase())
  );

  const filteredDons = (data.allDonations as any[]).filter(d => 
    d.reference.toLowerCase().includes(donFilter.toLowerCase()) ||
    `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(donFilter.toLowerCase())
  );

  return (
    <section className="section-wrap reveal active admin-page" style={{ padding: '1rem' }}>
      <header style={{ padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Inventory</p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Inventory Control</h1>
          <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>System-wide oversight of hair stock, wig stock, and donation history.</p>
        </div>
        
      </header>

      {/* Summary Grid - Always Visible or just on Overview? Let's keep it on Overview for a cleaner look */}
      {view === 'overview' && (
        <>
          <div className="inv-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', margin: '0.75rem 0' }}>
            {[
              { label: 'Hair Records', count: data.totalHairRecords, icon: 'bx-cut' },
              { label: 'Wig Stock', count: data.wigCount, icon: 'bx-shopping-bag' },
              { label: 'Donation History', count: data.allDonationsCount, icon: 'bx-history' },
              { label: 'Available Stock', count: data.totalHairRecords, icon: 'bx-check-circle' },
            ].map((item, i) => (
              <div key={i} className="inv-summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#8c7895', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                <strong style={{ fontSize: '1.4rem', color: '#ad246d' }}>{item.count}</strong>
              </div>
            ))}
          </div>

          <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
            <h3 style={{ borderBottom: '1px solid #ead7e8', paddingBottom: '0.6rem', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className='bx bx-transfer-alt' style={{ color: '#ad246d' }}></i> Hair Stock Categorization
            </h3>
            <div className="hair-stock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {['Short', 'Medium', 'Long'].map(len => (
                <div key={len} className="hair-stock-col" style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
                  <h4 style={{ margin: '0 0 0.6rem 0', color: '#ad246d', fontSize: '0.9rem' }}>{len}</h4>
                  {['Black', 'Brown', 'Light'].map(col => (
                    <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #ead7e8', fontSize: '0.8rem' }}>
                      <span style={{ color: '#665772' }}>{col}</span>
                      <strong style={{ color: '#ad246d' }}>{data.stock[len]?.[col] || 0}</strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>
        </>
      )}

      {view === 'hair' && (
        <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}><i className='bx bx-cut' style={{ color: '#ad246d' }}></i> Detailed Hair Stock</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c7895' }}>View-only oversight of received hair donations by category.</p>
          </div>
          <div className="hair-stock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {['Short', 'Medium', 'Long'].map(len => (
              <div key={len} className="hair-stock-col" style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', border: '1px solid #f2ebf4' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: '#ad246d' }}>{len} CATEGORY</h4>
                {['Black', 'Brown', 'Light', 'Gray', 'Other'].map(col => (
                  <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #ead7e8', fontSize: '0.85rem' }}>
                    <span>{col} Hair</span>
                    <strong>{data.stock[len]?.[col] || 0}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>
      )}

      {view === 'wigs' && (
        <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
          <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}><i className='bx bx-shopping-bag' style={{ color: '#ad246d' }}></i> Completed Wig Stock</h3>
            <input 
              type="text" 
              placeholder="Search wig stock..." 
              value={wigFilter} 
              onChange={e => setWigFilter(e.target.value)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid #ead7e8', fontSize: '0.8rem' }}
            />
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Task Code</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Wigmaker</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Size</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Color</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Stock Date</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredWigs.map((wig: any) => (
                  <tr key={wig.id}>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><strong>{wig.taskCode}</strong></td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{wig.wigmaker?.firstName} {wig.wigmaker?.lastName}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{wig.targetLength}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{wig.targetColor}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{new Date(wig.updatedAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><span className="admin-chip active" style={{ fontSize: '0.65rem' }}>In Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {view === 'donations' && (
        <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' }}>
          <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}><i className='bx bx-history' style={{ color: '#ad246d' }}></i> Donation Records History</h3>
            <input 
              type="text" 
              placeholder="Search donor history..." 
              value={donFilter} 
              onChange={e => setDonFilter(e.target.value)}
              style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', border: '1px solid #ead7e8', fontSize: '0.8rem' }}
            />
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Ref</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Donor</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Length</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Color</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Submission</th>
                  <th style={{ fontSize: '0.75rem', padding: '0.6rem' }}>Staff Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDons.map((don: any) => (
                  <tr key={don.id}>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><strong>{don.reference}</strong></td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{don.user?.firstName} {don.user?.lastName}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{don.hairLength}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{don.hairColor}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}>{new Date(don.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.8rem', padding: '0.6rem' }}><StatusPill status={don.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  );
};

export default AdminInventory;
