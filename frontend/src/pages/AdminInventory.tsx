import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const AdminInventory: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wigFilter, setWigFilter] = useState('');
  const [donFilter, setDonFilter] = useState('');

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

  if (loading) return <div className="section-wrap">Loading inventory...</div>;

  const filteredWigs = (data.wigStock as any[]).filter(w => 
    w.taskCode.toLowerCase().includes(wigFilter.toLowerCase()) ||
    `${w.wigmaker?.firstName} ${w.wigmaker?.lastName}`.toLowerCase().includes(wigFilter.toLowerCase())
  );

  const filteredDons = (data.allDonations as any[]).filter(d => 
    d.reference.toLowerCase().includes(donFilter.toLowerCase()) ||
    `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(donFilter.toLowerCase())
  );

  return (
    <section className="section-wrap reveal active admin-page">
      <header style={{ padding: '0.6rem 0 0.2rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.2rem' }}>Admin · Inventory</p>
        <h1 style={{ fontSize: '2.1rem', color: '#261d2b', margin: 0 }}>Check Inventory</h1>
        <p style={{ color: '#665772', fontSize: '0.88rem', marginTop: '0.25rem' }}>Complete view of all hair stock, wig stock, and donation records.</p>
      </header>

      <div className="inv-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        {[
          { label: 'Hair Records', count: data.totalHairRecords },
          { label: 'Wig Stock', count: data.wigCount },
          { label: 'All Donations', count: data.allDonationsCount },
          { label: 'Available Hair', count: data.totalHairRecords },
        ].map((item, i) => (
          <div key={i} className="inv-summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#8c7895', fontWeight: 700 }}>{item.label}</span>
            <strong style={{ fontSize: '1.75rem', color: '#ad246d' }}>{item.count}</strong>
          </div>
        ))}
      </div>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid #ead7e8', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className='bx bx-transfer-alt' style={{ color: '#ad246d' }}></i> Hair Stock Categorization
        </h3>
        <div className="hair-stock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
          {['Short', 'Medium', 'Long'].map(len => (
            <div key={len} className="hair-stock-col" style={{ background: '#fdf7fb', padding: '1.25rem', borderRadius: '16px' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#ad246d' }}>{len}</h4>
              {['Black', 'Brown', 'Light'].map(col => (
                <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #ead7e8' }}>
                  <span>{col}</span>
                  <strong>{data.stock[len]?.[col] || 0}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </article>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}><i className='bx bx-package' style={{ color: '#ad246d' }}></i> Completed Wigs</h3>
          <input 
            type="text" 
            placeholder="Search wigs..." 
            value={wigFilter} 
            onChange={e => setWigFilter(e.target.value)}
            style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #ead7e8' }}
          />
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Task Code</th>
                <th>Wigmaker</th>
                <th>Size</th>
                <th>Color</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredWigs.map((wig: any) => (
                <tr key={wig.id}>
                  <td><strong>{wig.taskCode}</strong></td>
                  <td>{wig.wigmaker?.firstName} {wig.wigmaker?.lastName}</td>
                  <td>{wig.targetLength}</td>
                  <td>{wig.targetColor}</td>
                  <td>{new Date(wig.updatedAt).toLocaleDateString()}</td>
                  <td><span className="admin-chip active">In Stock</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="admin-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1.5rem' }}>
        <div className="admin-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}><i className='bx bx-user-voice' style={{ color: '#ad246d' }}></i> Donation Records</h3>
          <input 
            type="text" 
            placeholder="Search donations..." 
            value={donFilter} 
            onChange={e => setDonFilter(e.target.value)}
            style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #ead7e8' }}
          />
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Donor</th>
                <th>Length</th>
                <th>Color</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDons.map((don: any) => (
                <tr key={don.id}>
                  <td><strong>{don.reference}</strong></td>
                  <td>{don.user?.firstName} {don.user?.lastName}</td>
                  <td>{don.hairLength}</td>
                  <td>{don.hairColor}</td>
                  <td>{new Date(don.createdAt).toLocaleDateString()}</td>
                  <td><StatusPill status={don.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default AdminInventory;
