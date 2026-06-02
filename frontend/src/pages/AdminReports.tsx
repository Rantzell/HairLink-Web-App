import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

const AdminReports: React.FC = () => {
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [monetaryData, setMonetaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('full');
  const [donationsPage, setDonationsPage] = useState(1);
  const [wigStockPage, setWigStockPage] = useState(1);
  const [monetaryPage, setMonetaryPage] = useState(1);
  const [fullLogsPage, setFullLogsPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type) setReportType(type);
    setDonationsPage(1); setWigStockPage(1); setMonetaryPage(1); setFullLogsPage(1);
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

  const handleDownloadCSV = async () => {
    try {
      const res = await apiClient.get('/internal-api/admin/reports/export/csv', {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hairlink_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download failed', err);
      toast.error('Failed to download CSV. Please try again.');
    }
  };

  if (loading) return <div className="section-wrap">Aggregating system and financial records...</div>;
  if (!data) return <div className="section-wrap">Error: Could not generate system reports. Please check your connection.</div>;

  const renderReportContent = () => {
    switch(reportType) {
      case 'monetary':
        return (
          <div className="report-document admin-report-doc">
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Financial Oversight Report</h2>
                <p className="admin-report-doc-subtitle">Complete audit of monetary contributions and financial status.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-FIN-AUDIT-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-report-two-col">
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">TOTAL FUNDS RAISED</small>
                  <strong className="admin-report-kpi-value">₱{data.summary.monetaryTotal?.toLocaleString()}</strong>
                </div>
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">TOTAL CONTRIBUTORS</small>
                  <strong className="admin-report-kpi-value">{monetaryData.length} contributors</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">Contribution Log</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Reference</th>
                    <th className="admin-report-th">Contributor Name / Email</th>
                    <th className="admin-report-th">Amount</th>
                    <th className="admin-report-th">Method</th>
                    <th className="admin-report-th">Date</th>
                    <th className="admin-report-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monetaryData.slice((monetaryPage - 1) * PAGE_SIZE, monetaryPage * PAGE_SIZE).map((m: any) => (
                    <tr key={m.id}>
                      <td className="admin-report-td"><strong>{m.referenceNumber}</strong></td>
                      <td className="admin-report-td">{m.name || m.user?.firstName || 'Anonymous'} <br/><small>{m.email || m.user?.email}</small></td>
                      <td className="admin-report-td">₱{m.amount?.toLocaleString()}</td>
                      <td className="admin-report-td">{m.paymentMethod}</td>
                      <td className="admin-report-td">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="admin-report-td">{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={monetaryPage} totalPages={Math.ceil(monetaryData.length / PAGE_SIZE)} onPageChange={setMonetaryPage} />
            </section>
          </div>
        );
      case 'hair':
        return (
          <div className="report-document admin-report-doc">
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Complete Hair Inventory Audit</h2>
                <p className="admin-report-doc-subtitle">Exhaustive log of hair stock categorization and donation records.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-AUDIT-HAIR-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <h3 className="admin-report-section-title">1. Stock Categorization</h3>
              <div className="admin-three-col-no-mb">
                {['Short', 'Long'].map(len => (
                  <div key={len} className="admin-report-mini-card">
                    <h4 className="admin-report-mini-title">{len} Strands</h4>
                    {['Black', 'Brown', 'Light', 'Gray', 'Other'].map(col => (
                      <div key={col} className="admin-report-mini-row">
                        <span>{col}</span>
                        <strong>{data.inventory.stock[len]?.[col] || 0}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">2. Full Donation History</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Ref No.</th>
                    <th className="admin-report-th">Donor Name</th>
                    <th className="admin-report-th">Length</th>
                    <th className="admin-report-th">Color</th>
                    <th className="admin-report-th">Date</th>
                    <th className="admin-report-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.allDonations.slice((donationsPage - 1) * PAGE_SIZE, donationsPage * PAGE_SIZE).map((d: any) => (
                    <tr key={d.id}>
                      <td className="admin-report-td"><strong>{d.reference}</strong></td>
                      <td className="admin-report-td">{d.user?.firstName} {d.user?.lastName}</td>
                      <td className="admin-report-td">{d.hairLength}</td>
                      <td className="admin-report-td">{d.hairColor}</td>
                      <td className="admin-report-td">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="admin-report-td">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={donationsPage} totalPages={Math.ceil(data.inventory.allDonations.length / PAGE_SIZE)} onPageChange={setDonationsPage} />
            </section>
          </div>
        );
      case 'wigs':
        return (
          <div className="report-document admin-report-doc">
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Complete Wig Stock & Production Audit</h2>
                <p className="admin-report-doc-subtitle">Exhaustive inventory of finished wigs and manufacturing history.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-AUDIT-WIG-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-three-col-no-mb">
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">CURRENT INVENTORY</small>
                  <strong className="admin-action-link-icon">{data.inventory.wigCount} wigs</strong>
                </div>
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">PRODUCTION YIELD</small>
                  <strong className="admin-action-link-icon">{data.inventory.allDonationsCount} units</strong>
                </div>
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">FULFILLMENT</small>
                  <strong className="admin-action-link-icon">{data.dashboard.requestsCount} recipients</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">Finished Wig Stock Log</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Task Code</th>
                    <th className="admin-report-th">Wigmaker</th>
                    <th className="admin-report-th">Target Length</th>
                    <th className="admin-report-th">Target Color</th>
                    <th className="admin-report-th">Stock Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.wigStock.slice((wigStockPage - 1) * PAGE_SIZE, wigStockPage * PAGE_SIZE).map((w: any) => (
                    <tr key={w.id}>
                      <td className="admin-report-td"><strong>{w.taskCode}</strong></td>
                      <td className="admin-report-td">{w.wigmaker?.firstName} {w.wigmaker?.lastName}</td>
                      <td className="admin-report-td">{w.targetLength}</td>
                      <td className="admin-report-td">{w.targetColor}</td>
                      <td className="admin-report-td">{new Date(w.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={wigStockPage} totalPages={Math.ceil(data.inventory.wigStock.length / PAGE_SIZE)} onPageChange={setWigStockPage} />
            </section>
          </div>
        );
      default: // 'full'
        return (
          <div className="report-document admin-report-doc">
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">HairLink Comprehensive System Audit</h2>
                <p className="admin-report-doc-subtitle">Global operational report including all inventory, financial, and participant data.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-FULL-AUDIT-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-four-col-grid">
                <div><small className="admin-match-meta">HAIR DONATIONS</small><p className="admin-section-title">{data.dashboard.donationsCount}</p></div>
                <div><small className="admin-match-meta">MONETARY TOTAL</small><p className="admin-section-title">₱{data.summary.monetaryTotal?.toLocaleString()}</p></div>
                <div><small className="admin-match-meta">FULFILLMENT</small><p className="admin-section-title">{data.dashboard.requestsCount}</p></div>
                <div><small className="admin-match-meta">INVENTORY</small><p className="admin-section-title">{data.inventory.wigCount}</p></div>
              </div>
            </section>

            <section className="admin-report-section">
              <h3 className="admin-report-section-title">Operational Breakdown</h3>
              <div className="admin-two-col-grid-2rem">
                <div>
                  <h4 className="admin-report-mini-title">Stock Inventory</h4>
                  <div className="admin-report-row"><span>Raw Hair Strands</span><strong>{data.inventory.totalHairRecords} units</strong></div>
                  <div className="admin-report-row"><span>Finished Wigs</span><strong>{data.inventory.wigCount} wigs</strong></div>
                </div>
                <div>
                  <h4 className="admin-report-mini-title">Financial Summary</h4>
                  <div className="admin-report-row"><span>Total Contributions</span><strong>₱{data.summary.monetaryTotal?.toLocaleString()}</strong></div>
                  <div className="admin-report-row"><span>Contributor Base</span><strong>{monetaryData.length} contributors</strong></div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">Full Hair Donation Records</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Reference</th>
                    <th className="admin-report-th">Donor Name</th>
                    <th className="admin-report-th">Length</th>
                    <th className="admin-report-th">Color</th>
                    <th className="admin-report-th">Date</th>
                    <th className="admin-report-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.inventory.allDonations || []).slice((fullLogsPage - 1) * PAGE_SIZE, fullLogsPage * PAGE_SIZE).map((d: any) => (
                    <tr key={d.id}>
                      <td className="admin-report-td"><strong>{d.reference}</strong></td>
                      <td className="admin-report-td">{d.user?.firstName} {d.user?.lastName}</td>
                      <td className="admin-report-td">{d.hairLength}</td>
                      <td className="admin-report-td">{d.hairColor}</td>
                      <td className="admin-report-td">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="admin-report-td">{d.status}</td>
                    </tr>
                  ))}
                  {(data.inventory.allDonations || []).length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#8c7895', fontSize: '0.75rem' }}>No donation records found.</td></tr>
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={fullLogsPage}
                totalPages={Math.ceil((data.inventory.allDonations || []).length / PAGE_SIZE)}
                onPageChange={setFullLogsPage}
              />
            </section>
          </div>
        );
    }
  };

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad" id="reportRoot">
      <header className="no-print admin-report-header-row">
        <div>
          <p className="admin-page-kicker">Admin · Analytics</p>
          <h1 className="admin-page-title">System Reports</h1>
          <p className="admin-page-subtitle">Generate comprehensive operational audits for inventory and finance.</p>
        </div>

        <div className="admin-btn-actions">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="admin-btn-icon"
          >
            <i className='bx bx-download'></i> Download CSV
          </button>
          <button
            onClick={handlePrint}
            className="admin-btn-print"
          >
            <i className='bx bx-printer'></i> Print Current
          </button>
        </div>
      </header>

      {/* Report type tab bar */}
      <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { key: 'full',     label: '📋 All Donations' },
          { key: 'hair',     label: '✂️ Hair Inventory' },
          { key: 'wigs',     label: '🧵 Wig Stock' },
          { key: 'monetary', label: '💳 Monetary' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setReportType(tab.key);
              setDonationsPage(1); setWigStockPage(1); setMonetaryPage(1); setFullLogsPage(1);
            }}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1.5px solid',
              borderColor: reportType === tab.key ? '#ad246d' : '#ead7e8',
              background: reportType === tab.key ? '#ad246d' : '#fff',
              color: reportType === tab.key ? '#fff' : '#665772',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
