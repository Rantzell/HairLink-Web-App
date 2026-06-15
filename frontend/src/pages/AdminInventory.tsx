import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';

const AdminInventory: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState('overview'); 
  const [wigFilter, setWigFilter] = useState('');
  const [donFilter, setDonFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v) setView(v);
  }, [location.search]);

  const fetchInventory = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get('/internal-api/admin/inventory');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to fetch inventory', err);
      const serverMsg = err?.response?.data?.message || err?.message || 'Unknown error';
      setErrorMsg(serverMsg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);

  if (loading) return <div className="section-wrap">Loading inventory oversight...</div>;
  if (!data) return (
    <div className="section-wrap">
      <div className="admin-error-box">Error: Could not load inventory data.</div>
      {errorMsg && <div className="admin-error-detail">{errorMsg}</div>}
      <div style={{ marginTop: '1rem' }}>
        <button className="admin-btn" onClick={() => fetchInventory()}>Retry</button>
        {errorMsg && errorMsg.toLowerCase().includes('auth') && (
          <button className="admin-btn" style={{ marginLeft: '0.75rem' }} onClick={() => { window.location.href = '/login'; }}>Sign in</button>
        )}
      </div>
    </div>
  );

  const filteredWigs = (data.wigStock as any[]).filter(w => 
    w.taskCode.toLowerCase().includes(wigFilter.toLowerCase()) ||
    `${w.wigmaker?.firstName} ${w.wigmaker?.lastName}`.toLowerCase().includes(wigFilter.toLowerCase())
  );

  const filteredDons = (data.allDonations as any[]).filter(d => 
    d.reference.toLowerCase().includes(donFilter.toLowerCase()) ||
    `${d.user?.firstName} ${d.user?.lastName}`.toLowerCase().includes(donFilter.toLowerCase())
  );

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad">
      <header className="admin-report-header-row">
        <div>
          <p className="admin-page-kicker">Admin · Inventory</p>
          <h1 className="admin-page-title">Inventory Control</h1>
          <p className="admin-page-subtitle">System-wide oversight of hair stock, wig stock, and donation history.</p>
        </div>
        
      </header>

      {/* Summary Grid - Always Visible or just on Overview? Let's keep it on Overview for a cleaner look */}
      {view === 'overview' && (
        <div className="inv-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", margin: "0.75rem 0" }}>
          {[
            { label: 'Hair Records', count: data.totalHairRecords, icon: 'bx-cut' },
            { label: 'Wig Stock', count: data.wigCount, icon: 'bx-shopping-bag' },
            { label: 'Donation History', count: data.allDonationsCount, icon: 'bx-history' },
            { label: 'Available Stock', count: data.totalHairRecords, icon: 'bx-check-circle' },
          ].map((item, i) => (
            <div key={i} className="inv-summary-item admin-mini-stat">
              <span className="admin-mini-stat-label">{item.label}</span>
              <strong className="admin-val-pink-lg">{item.count}</strong>
            </div>
          ))}
        </div>
      )}

      {view === 'hair' && (
        <article className="admin-card admin-card-white">
          <div className="admin-card-head-mb">
            <h3 className="admin-bar-title"><i className="bx bx-cut admin-icon-pink"></i> Detailed Hair Stock</h3>
            <p className="admin-queue-meta">View-only oversight of received hair donations by category.</p>
          </div>
          <div className="hair-stock-grid admin-hair-stock-grid-lg">
            {['Short', 'Long'].map(len => (
              <div key={len} className="hair-stock-col admin-hair-col">
                <h4 className="admin-hair-col-title-lg">{len} CATEGORY</h4>
                {['Black', 'Brown', 'Light'].map(col => (
                  <div key={col} className="admin-hair-row-lg">
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
        <article className="admin-card admin-card-white">
          <div className="admin-bar admin-bar">
            <h3 className="admin-bar-title"><i className="bx bx-shopping-bag admin-icon-pink"></i> Completed Wig Stock</h3>
            <div className="admin-search-wrapper">
              <i className="bx bx-search admin-search-icon"></i>
              <input 
                type="text" 
                placeholder="Search wig stock..." 
                value={wigFilter} 
                onChange={e => setWigFilter(e.target.value)}
                className="admin-filter-input"
              />
            </div>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-compact-th">Task Code</th>
                  <th className="admin-compact-th">Wigmaker</th>
                  <th className="admin-compact-th">Size</th>
                  <th className="admin-compact-th">Color</th>
                  <th className="admin-compact-th">Stock Date</th>
                  <th className="admin-compact-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredWigs.map((wig: any) => (
                  <tr key={wig.id}>
                    <td className="admin-compact-td"><strong>{wig.taskCode}</strong></td>
                    <td className="admin-compact-td">{wig.wigmaker?.firstName} {wig.wigmaker?.lastName}</td>
                    <td className="admin-compact-td">{wig.targetLength}</td>
                    <td className="admin-compact-td">{wig.targetColor}</td>
                    <td className="admin-compact-td">{new Date(wig.updatedAt).toLocaleDateString()}</td>
                    <td className="admin-compact-td"><span className="admin-chip active admin-chip-sm">In Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {view === 'donations' && (
        <article className="admin-card admin-card-white">
          <div className="admin-bar admin-bar">
            <h3 className="admin-bar-title"><i className="bx bx-history admin-icon-pink"></i> Donation Records History</h3>
            <div className="admin-search-wrapper">
              <i className="bx bx-search admin-search-icon"></i>
              <input 
                type="text" 
                placeholder="Search donor history..." 
                value={donFilter} 
                onChange={e => setDonFilter(e.target.value)}
                className="admin-filter-input"
              />
            </div>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-compact-th">Ref</th>
                  <th className="admin-compact-th">Donor</th>
                  {filteredDons.length > 0 && (filteredDons[0].amount !== undefined || filteredDons[0].referenceNumber !== undefined) ? (
                    <>
                      <th className="admin-compact-th">Amount</th>
                      <th className="admin-compact-th">Method</th>
                      <th className="admin-compact-th">Submission</th>
                    </>
                  ) : (
                    <>
                      <th className="admin-compact-th">Length</th>
                      <th className="admin-compact-th">Color</th>
                      <th className="admin-compact-th">Submission</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredDons.map((don: any) => (
                  <tr key={don.id}>
                    <td className="admin-compact-td"><strong>{don.reference || don.referenceNumber}</strong></td>
                    <td className="admin-compact-td">{don.user?.firstName} {don.user?.lastName}</td>
                    {don.amount !== undefined || don.referenceNumber !== undefined ? (
                      <>
                        <td className="admin-compact-td">₱{don.amount?.toLocaleString?.() || '—'}</td>
                        <td className="admin-compact-td">{don.paymentMethod || don.method || '—'}</td>
                        <td className="admin-compact-td">{new Date(don.createdAt || don.updatedAt).toLocaleDateString()}</td>
                      </>
                    ) : (
                      <>
                        <td className="admin-compact-td">{don.hairLength}</td>
                        <td className="admin-compact-td">{don.hairColor}</td>
                        <td className="admin-compact-td">{new Date(don.createdAt).toLocaleDateString()}</td>
                      </>
                    )}
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
