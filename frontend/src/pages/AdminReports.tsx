import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';


const AdminReports: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [monetaryData, setMonetaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('full');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type) setReportType(type);
  }, [location.search]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [dashboardRes, inventoryRes, reportsRes, monetaryRes] = await Promise.all([
          apiClient.get('/internal-api/admin/dashboard'),
          apiClient.get('/internal-api/admin/inventory'),
          apiClient.get('/internal-api/admin/reports'),
          apiClient.get('/internal-api/admin/reports/monetary')
        ]);
        
        setData({
          dashboard: dashboardRes.data,
          inventory: inventoryRes.data,
          summary: reportsRes.data,
          timestamp: new Date().toLocaleString()
        });
        setMonetaryData(monetaryRes.data);
      } catch (err) {
        console.error('Failed to fetch report data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="section-wrap">Aggregating system and financial records...</div>;
  if (!data) return <div className="section-wrap">Error: Could not generate system reports. Please check your connection.</div>;

  const renderReportContent = () => {
    switch(reportType) {
      case 'monetary':
        return (
          <div className="report-document" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '2rem' }}>
            <div className="report-header" style={{ borderBottom: '2px solid #ad246d', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ color: '#ad246d', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Financial Oversight Report</h2>
                <p style={{ margin: '0.2rem 0', color: '#8c7895', fontSize: '0.8rem' }}>Complete audit of monetary contributions and financial status.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.7rem' }}>HL-FIN-AUDIT-{new Date().getFullYear()}</p>
                <p style={{ margin: 0, color: '#8c7895', fontSize: '0.65rem' }}>{data.timestamp}</p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <div style={{ background: '#fdf7fb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #ead7e8', textAlign: 'center' }}>
                  <small style={{ color: '#8c7895', display: 'block', fontSize: '0.65rem' }}>TOTAL FUNDS RAISED</small>
                  <strong style={{ fontSize: '1.8rem', color: '#ad246d' }}>₱{data.summary.monetaryTotal?.toLocaleString()}</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #ead7e8', textAlign: 'center' }}>
                  <small style={{ color: '#8c7895', display: 'block', fontSize: '0.65rem' }}>TOTAL CONTRIBUTORS</small>
                  <strong style={{ fontSize: '1.8rem', color: '#ad246d' }}>{monetaryData.length} contributors</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>Contribution Log</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                <thead>
                  <tr style={{ background: '#fdf7fb' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Reference</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Contributor Name / Email</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Method</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monetaryData.map((m: any) => (
                    <tr key={m.id}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}><strong>{m.referenceNumber}</strong></td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{m.name || m.user?.firstName || 'Anonymous'} <br/><small>{m.email || m.user?.email}</small></td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>₱{m.amount?.toLocaleString()}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{m.paymentMethod}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        );
      case 'hair':
        return (
          <div className="report-document" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '2rem' }}>
            <div className="report-header" style={{ borderBottom: '2px solid #ad246d', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ color: '#ad246d', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Complete Hair Inventory Audit</h2>
                <p style={{ margin: '0.2rem 0', color: '#8c7895', fontSize: '0.8rem' }}>Exhaustive log of hair stock categorization and donation records.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.7rem' }}>HL-AUDIT-HAIR-{new Date().getFullYear()}</p>
                <p style={{ margin: 0, color: '#8c7895', fontSize: '0.65rem' }}>{data.timestamp}</p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>1. Stock Categorization</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {['Short', 'Medium', 'Long'].map(len => (
                  <div key={len} style={{ background: '#fdf7fb', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ead7e8' }}>
                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem' }}>{len} Strands</h4>
                    {['Black', 'Brown', 'Light', 'Gray', 'Other'].map(col => (
                      <div key={col} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0.7rem' }}>
                        <span>{col}</span>
                        <strong>{data.inventory.stock[len]?.[col] || 0}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>2. Full Donation History</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                <thead>
                  <tr style={{ background: '#fdf7fb' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Ref No.</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Donor Name</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Length</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Color</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.allDonations.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}><strong>{d.reference}</strong></td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{d.user?.firstName} {d.user?.lastName}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{d.hairLength}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{d.hairColor}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        );
      case 'wigs':
        return (
          <div className="report-document" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '2rem' }}>
            <div className="report-header" style={{ borderBottom: '2px solid #ad246d', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ color: '#ad246d', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Complete Wig Stock & Production Audit</h2>
                <p style={{ margin: '0.2rem 0', color: '#8c7895', fontSize: '0.8rem' }}>Exhaustive inventory of finished wigs and manufacturing history.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.7rem' }}>HL-AUDIT-WIG-{new Date().getFullYear()}</p>
                <p style={{ margin: 0, color: '#8c7895', fontSize: '0.65rem' }}>{data.timestamp}</p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '10px', border: '1px solid #ead7e8', textAlign: 'center' }}>
                  <small style={{ color: '#8c7895', display: 'block', fontSize: '0.65rem' }}>CURRENT INVENTORY</small>
                  <strong style={{ fontSize: '1.5rem', color: '#ad246d' }}>{data.inventory.wigCount} wigs</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '10px', border: '1px solid #ead7e8', textAlign: 'center' }}>
                  <small style={{ color: '#8c7895', display: 'block', fontSize: '0.65rem' }}>PRODUCTION YIELD</small>
                  <strong style={{ fontSize: '1.5rem', color: '#ad246d' }}>{data.inventory.allDonationsCount} units</strong>
                </div>
                <div style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '10px', border: '1px solid #ead7e8', textAlign: 'center' }}>
                  <small style={{ color: '#8c7895', display: 'block', fontSize: '0.65rem' }}>FULFILLMENT</small>
                  <strong style={{ fontSize: '1.5rem', color: '#ad246d' }}>{data.dashboard.requestsCount} recipients</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>Finished Wig Stock Log</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                <thead>
                  <tr style={{ background: '#fdf7fb' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Task Code</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Wigmaker</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Target Length</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Target Color</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ead7e8' }}>Stock Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.wigStock.map((w: any) => (
                    <tr key={w.id}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}><strong>{w.taskCode}</strong></td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{w.wigmaker?.firstName} {w.wigmaker?.lastName}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{w.targetLength}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{w.targetColor}</td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #f2ebf4' }}>{new Date(w.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        );
      default: // 'full'
        return (
          <div className="report-document" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '2rem' }}>
            <div className="report-header" style={{ borderBottom: '2px solid #ad246d', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ color: '#ad246d', margin: 0, fontSize: '1.6rem', fontWeight: 900 }}>HairLink Comprehensive System Audit</h2>
                <p style={{ margin: '0.2rem 0', color: '#8c7895', fontSize: '0.85rem' }}>Global operational report including all inventory, financial, and participant data.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.75rem' }}>HL-FULL-AUDIT-{new Date().getFullYear()}</p>
                <p style={{ margin: 0, color: '#8c7895', fontSize: '0.7rem' }}>{data.timestamp}</p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                <div><small style={{ color: '#8c7895' }}>HAIR DONATIONS</small><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{data.dashboard.donationsCount}</p></div>
                <div><small style={{ color: '#8c7895' }}>MONETARY TOTAL</small><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>₱{data.summary.monetaryTotal?.toLocaleString()}</p></div>
                <div><small style={{ color: '#8c7895' }}>FULFILLMENT</small><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{data.dashboard.requestsCount}</p></div>
                <div><small style={{ color: '#8c7895' }}>INVENTORY</small><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{data.inventory.wigCount}</p></div>
              </div>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>Operational Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>Stock Inventory</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0.75rem' }}><span>Raw Hair Strands</span><strong>{data.inventory.totalHairRecords} units</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0.75rem' }}><span>Finished Wigs</span><strong>{data.inventory.wigCount} wigs</strong></div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem' }}>Financial Summary</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0.75rem' }}><span>Total Contributions</span><strong>₱{data.summary.monetaryTotal?.toLocaleString()}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0.75rem' }}><span>Contributor Base</span><strong>{monetaryData.length} contributors</strong></div>
                </div>
              </div>
            </section>

            <section>
              <h3 style={{ fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0.8rem', borderBottom: '1px solid #f2ebf4' }}>Global Operational Logs (Recent)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
                <thead>
                  <tr style={{ background: '#fdf7fb' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ead7e8' }}>Reference</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ead7e8' }}>Activity</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ead7e8' }}>Participant</th>
                    <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #ead7e8' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dashboard.monetaryDonations.slice(0, 5).map((m: any) => (
                    <tr key={m.id}>
                      <td style={{ padding: '0.4rem', borderBottom: '1px solid #f2ebf4' }}>{m.referenceNumber}</td>
                      <td style={{ padding: '0.4rem', borderBottom: '1px solid #f2ebf4' }}>Monetary Donation (₱{m.amount})</td>
                      <td style={{ padding: '0.4rem', borderBottom: '1px solid #f2ebf4' }}>{m.name || 'Anonymous'}</td>
                      <td style={{ padding: '0.4rem', borderBottom: '1px solid #f2ebf4' }}>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        );
    }
  };

  return (
    <section className="section-wrap reveal active admin-page" id="reportRoot" style={{ padding: '1rem' }}>
      <header className="no-print" style={{ padding: '0.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0.1rem' }}>Admin · Analytics</p>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>System Reports</h1>
          <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.1rem' }}>Generate comprehensive operational audits for inventory and finance.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a 
            href={`${apiClient.defaults.baseURL}/internal-api/admin/reports/export/csv`}
            download
            style={{ 
              padding: '0.5rem 1.25rem', 
              borderRadius: '8px', 
              background: '#fdf2f8', 
              color: '#ad246d', 
              border: '1px solid #ead7e8',
              fontWeight: 800, 
              fontSize: '0.8rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <i className='bx bx-download'></i> Download CSV
          </a>
          <button 
            onClick={handlePrint}
            style={{ 
              padding: '0.5rem 1.25rem', 
              borderRadius: '8px', 
              background: '#ad246d', 
              color: '#fff', 
              border: 'none', 
              fontWeight: 800, 
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className='bx bx-printer'></i> Print Current
          </button>
        </div>
      </header>

      {/* Selectable Report Content */}
      {renderReportContent()}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #reportRoot, #reportRoot * { visibility: visible; }
          #reportRoot { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0; 
            padding: 0;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          .report-document { 
            border: none !important; 
            box-shadow: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </section>
  );
};

export default AdminReports;
