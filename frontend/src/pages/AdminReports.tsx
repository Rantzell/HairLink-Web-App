import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 10;

const AdminReports: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('donations');
  const [monetaryData, setMonetaryData] = useState<any[]>([]);
  const [donationsPage, setDonationsPage] = useState(1);
  const [wigStockPage, setWigStockPage] = useState(1);
  const [monetaryPage, setMonetaryPage] = useState(1);
  const [matchingPage, setMatchingPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type) setReportType(type);
    setDonationsPage(1); setWigStockPage(1); setMonetaryPage(1); setMatchingPage(1);
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
    setIsPrinting(true);
  };

  useEffect(() => {
    if (isPrinting) {
      setTimeout(() => {
        import('../utils/pdfExport').then(({ exportPDF }) => {
          exportPDF('reportDocument', `System-Report-${reportType}`).finally(() => {
            setIsPrinting(false);
          });
        });
      }, 500); // Wait for React to re-render and images to load
    }
  }, [isPrinting, reportType]);

  const handleDownloadCSV = () => {
    let csv = '';
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    if (reportType === 'donations') {
      csv = 'Reference,Donor Name,Length,Color,Date\n';
      data.inventory?.allDonations?.forEach((d: any) => {
        csv += `${esc(d.reference)},${esc(d.user?.firstName + ' ' + d.user?.lastName)},${esc(d.hairLength)},${esc(d.hairColor)},${esc(new Date(d.createdAt).toLocaleDateString())}\n`;
      });
    } else if (reportType === 'hair') {
      csv = 'Length,Color,Stock Count\n';
      const stock = data.inventory?.stock;
      if (stock) {
        ['Short', 'Long'].forEach(len => {
          ['Black', 'Brown', 'Light'].forEach(col => {
            csv += `${esc(len)},${esc(col)},${esc(stock[len]?.[col] || 0)}\n`;
          });
        });
      }
    } else if (reportType === 'wigs') {
      csv = 'Task Code,Wigmaker,Target Length,Target Color,Stock Date\n';
      data.inventory?.wigStock?.forEach((w: any) => {
        csv += `${esc(w.taskCode)},${esc(w.wigmaker?.firstName + ' ' + w.wigmaker?.lastName)},${esc(w.targetLength)},${esc(w.targetColor)},${esc(new Date(w.updatedAt).toLocaleDateString())}\n`;
      });
    } else if (reportType === 'matching') {
      csv = 'Metric,Value\n';
      csv += `Fulfillment / Requests,${data.dashboard?.requestsCount || 0}\n`;
      csv += `Wigs Distributed,${data.summary?.wigsDistributed || 0}\n`;
      csv += `Recipients Served,${data.summary?.recipientsServed || 0}\n\n`;
      csv += 'Reference,Recipient,Length,Color,Received Date,Assigned Wig\n';
      (data.summary?.fulfilledRequests || [])
        .filter((req: any) => req.wigProductions?.some((w: any) => w.taskCode.includes('-W')))
        .forEach((req: any) => {
          const childWig = req.wigProductions?.find((w: any) => w.taskCode.includes('-W'));
          const assignedWig = childWig?.taskCode || '—';
          csv += `${esc(req.reference)},${esc(req.user?.firstName + ' ' + req.user?.lastName)},${esc(req.wigLength)},${esc(req.wigColor)},${esc(new Date(req.receivedAt || req.updatedAt).toLocaleDateString())},${esc(assignedWig)}\n`;
        });
    } else if (reportType === 'users') {
      csv = 'Metric,Value\n';
      csv += `Total Users,${data.summary?.usersCount || 0}\n`;
      csv += `System Events,${data.summary?.eventsCount || 0}\n`;
    } else if (reportType === 'monetary') {
      csv = 'Reference,Contributor Name / Email,Amount,Method,Date,Status\n';
      monetaryData.forEach((m: any) => {
        csv += `${esc(m.referenceNumber)},${esc(m.name || m.user?.firstName || 'Anonymous')},${esc(m.amount)},${esc(m.paymentMethod)},${esc(new Date(m.createdAt).toLocaleDateString())},${esc(m.status)}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hairlink_${reportType}_report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully.');
  };

  if (loading) return <div className="section-wrap">Aggregating system records...</div>;
  if (!data) return <div className="section-wrap">Error: Could not generate system reports. Please check your connection.</div>;

  const ReportBrandHeader = () => (
    <div className="admin-print-brand-header" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      borderBottom: '3px solid #ad246d', 
      paddingBottom: '1.5rem', 
      marginBottom: '2rem',
      backgroundColor: '#fdf7fc',
      padding: '1.5rem 2rem',
      borderRadius: '12px 12px 0 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
        <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink Logo" style={{ height: '45px', filter: 'drop-shadow(0 2px 4px rgba(173,36,109,0.2))' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '800', fontSize: '1.4rem', color: '#ad246d', lineHeight: '1' }}>HairLink</span>
          <span style={{ fontSize: '0.75rem', color: '#8c7895', fontWeight: '600', letterSpacing: '0.5px' }}>MANAGEMENT SYSTEM</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', flex: 2 }}>
        <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.8rem', color: '#ad246d', fontWeight: '900', letterSpacing: '-0.5px' }}>Strand Up for Cancer</h1>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#ad246d', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700', opacity: 0.8 }}>Official System Report</p>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <img src="/assets/images/landing/logo.jpg" alt="SUFC Logo" style={{ height: '55px', objectFit: 'contain', borderRadius: '50%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', border: '2px solid #fff' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
      </div>
    </div>
  );

  const renderReportContent = () => {
    switch(reportType) {
      case 'monetary':
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Monetary Contributions Log</h2>
                <p className="admin-report-doc-subtitle">Chronological record of incoming financial donations.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-MONEY-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-report-two-col">
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">TOTAL MONETARY TRANSACTIONS</small>
                  <strong className="admin-report-kpi-value">{monetaryData.length}</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">Contribution Log</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Reference</th>
                    <th className="admin-report-th">Contributor Name</th>
                    <th className="admin-report-th">Amount</th>
                    <th className="admin-report-th">Method</th>
                    <th className="admin-report-th">Date</th>
                    <th className="admin-report-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monetaryData]
                    .sort((a: any, b: any) => String(a.referenceNumber || '').localeCompare(String(b.referenceNumber || '')))
                    .slice(isPrinting ? 0 : (monetaryPage - 1) * PAGE_SIZE, isPrinting ? undefined : monetaryPage * PAGE_SIZE).map((m: any) => (
                    <tr key={m.id}>
                      <td className="admin-report-td"><strong>{m.referenceNumber}</strong></td>
                      <td className="admin-report-td">{m.name || m.user?.firstName || 'Anonymous'}</td>
                      <td className="admin-report-td">₱{m.amount?.toLocaleString()}</td>
                      <td className="admin-report-td">{m.paymentMethod}</td>
                      <td className="admin-report-td">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="admin-report-td">{m.status}</td>
                    </tr>
                  ))}
                  {monetaryData.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#8c7895', fontSize: '0.75rem' }}>No monetary records found.</td></tr>
                  )}
                </tbody>
              </table>
              {!isPrinting && <Pagination currentPage={monetaryPage} totalPages={Math.ceil(monetaryData.length / PAGE_SIZE)} onPageChange={setMonetaryPage} />}
            </section>
          </div>
        );
      case 'hair':
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Hair Inventory Levels</h2>
                <p className="admin-report-doc-subtitle">Categorization of physical hair stock by length and color.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-HAIR-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <h3 className="admin-report-section-title">Stock Categorization</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {['Short', 'Long'].map(len => (
                  <div key={len} className="admin-report-mini-card" style={{ flex: '1', minWidth: '250px', maxWidth: '350px' }}>
                    <h4 className="admin-report-mini-title">{len} Strands</h4>
                    {['Black', 'Brown', 'Light'].map(col => (
                      <div key={col} className="admin-report-mini-row">
                        <span>{col}</span>
                        <strong>{data.inventory.stock[len]?.[col] || 0}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      case 'wigs':
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Wig Inventory & Monitoring</h2>
                <p className="admin-report-doc-subtitle">Current stock of completed wigs and recent production yield.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-WIG-{new Date().getFullYear()}</p>
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
                  <small className="admin-report-kpi-label">RAW MATERIALS</small>
                  <strong className="admin-action-link-icon">{data.inventory.allDonationsCount} units</strong>
                </div>
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">PRODUCTION TO DATE</small>
                  <strong className="admin-action-link-icon">{data.summary.wigsDistributed + data.inventory.wigCount} units</strong>
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
                  {[...(data.inventory.wigStock || [])]
                    .sort((a: any, b: any) => String(a.taskCode || '').localeCompare(String(b.taskCode || '')))
                    .slice(isPrinting ? 0 : (wigStockPage - 1) * PAGE_SIZE, isPrinting ? undefined : wigStockPage * PAGE_SIZE).map((w: any) => (
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
              {!isPrinting && <Pagination currentPage={wigStockPage} totalPages={Math.ceil(data.inventory.wigStock.length / PAGE_SIZE)} onPageChange={setWigStockPage} />}
            </section>
          </div>
        );
      case 'matching':
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Wig Matching & Distribution</h2>
                <p className="admin-report-doc-subtitle">Records of fulfilled requests and recipient distribution.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-MATCH-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-three-col-no-mb">
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">TOTAL REQUESTS</small>
                  <strong className="admin-action-link-icon">{data.dashboard.requestsCount} requests</strong>
                </div>
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">WIGS DISTRIBUTED</small>
                  <strong className="admin-action-link-icon">{data.summary.wigsDistributed} units</strong>
                </div>
                <div className="admin-report-center-card">
                  <small className="admin-report-kpi-label">RECIPIENTS SERVED</small>
                  <strong className="admin-action-link-icon">{data.summary.recipientsServed} recipients</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="admin-report-section-title">Fulfilled Requests Log</h3>
              <table className="admin-report-table">
                <thead>
                  <tr className="admin-compact-table-head-row">
                    <th className="admin-report-th">Reference</th>
                    <th className="admin-report-th">Recipient</th>
                    <th className="admin-report-th">Length</th>
                    <th className="admin-report-th">Color</th>
                    <th className="admin-report-th">Received Date</th>
                    <th className="admin-report-th">Assigned Wig</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(data.summary.fulfilledRequests || [])]
                    .filter((req: any) => req.wigProductions?.some((w: any) => w.taskCode.includes('-W')))
                    .sort((a: any, b: any) => String(a.reference || '').localeCompare(String(b.reference || '')))
                    .slice(isPrinting ? 0 : (matchingPage - 1) * PAGE_SIZE, isPrinting ? undefined : matchingPage * PAGE_SIZE)
                    .map((req: any) => {
                      const childWig = req.wigProductions?.find((w: any) => w.taskCode.includes('-W'));
                      const assignedWig = childWig?.taskCode || '—';
                      return (
                        <tr key={req.id}>
                        <td className="admin-report-td"><strong>{req.reference}</strong></td>
                        <td className="admin-report-td">{req.user?.firstName} {req.user?.lastName}</td>
                        <td className="admin-report-td">{req.wigLength}</td>
                        <td className="admin-report-td">{req.wigColor}</td>
                        <td className="admin-report-td">{new Date(req.receivedAt || req.updatedAt).toLocaleDateString()}</td>
                        <td className="admin-report-td">
                          <strong>{assignedWig}</strong>
                        </td>
                      </tr>
                    );
                  })}
                  {(data.summary.fulfilledRequests || [])
                    .filter((req: any) => req.wigProductions?.some((w: any) => w.taskCode.includes('-W')))
                    .length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#8c7895', fontSize: '0.75rem' }}>No fulfilled requests found.</td></tr>
                  )}
                </tbody>
              </table>
              {!isPrinting && <Pagination
                currentPage={matchingPage}
                totalPages={Math.ceil(((data.summary.fulfilledRequests || []).filter((req: any) => req.wigProductions?.some((w: any) => w.taskCode.includes('-W')))).length / PAGE_SIZE)}
                onPageChange={setMatchingPage}
              />}
            </section>
          </div>
        );
      case 'users':
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">User Engagement Statistics</h2>
                <p className="admin-report-doc-subtitle">Platform adoption metrics and event engagement overview.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-USERS-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-report-two-col">
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">TOTAL REGISTERED USERS</small>
                  <strong className="admin-report-kpi-value">{data.summary.usersCount}</strong>
                </div>
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">SYSTEM EVENTS HOSTED</small>
                  <strong className="admin-report-kpi-value">{data.summary.eventsCount} events</strong>
                </div>
              </div>
            </section>
          </div>
        );
      case 'donations':
      default:
        return (
          <div className="report-document admin-report-doc" id="reportDocument">
            <ReportBrandHeader />
            <div className="report-header admin-report-doc-header">
              <div>
                <h2 className="admin-report-doc-title">Donation Intake Summary</h2>
                <p className="admin-report-doc-subtitle">Operational summary of all incoming hair donations.</p>
              </div>
              <div className="admin-match-score-wrap">
                <p className="admin-report-id">HL-RPT-INTAKE-{new Date().getFullYear()}</p>
                <p className="admin-report-timestamp">{data.timestamp}</p>
              </div>
            </div>

            <section className="admin-report-section">
              <div className="admin-report-two-col">
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">TOTAL DONATIONS INITIATED</small>
                  <strong className="admin-report-kpi-value">{data.dashboard.donationsCount}</strong>
                </div>
                <div className="admin-report-kpi-card">
                  <small className="admin-report-kpi-label">DONATIONS RECEIVED & VERIFIED</small>
                  <strong className="admin-report-kpi-value">{data.dashboard.approvedDonations}</strong>
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
                  </tr>
                </thead>
                <tbody>
                  {[...(data.inventory.allDonations || [])]
                    .sort((a: any, b: any) => String(a.reference || '').localeCompare(String(b.reference || '')))
                    .slice(isPrinting ? 0 : (donationsPage - 1) * PAGE_SIZE, isPrinting ? undefined : donationsPage * PAGE_SIZE).map((d: any) => (
                    <tr key={d.id}>
                      <td className="admin-report-td"><strong>{d.reference}</strong></td>
                      <td className="admin-report-td">{d.user?.firstName} {d.user?.lastName}</td>
                      <td className="admin-report-td">{d.hairLength}</td>
                      <td className="admin-report-td">{d.hairColor}</td>
                      <td className="admin-report-td">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {(data.inventory.allDonations || []).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#8c7895', fontSize: '0.75rem' }}>No donation records found.</td></tr>
                  )}
                </tbody>
              </table>
              {!isPrinting && <Pagination
                currentPage={donationsPage}
                totalPages={Math.ceil((data.inventory.allDonations || []).length / PAGE_SIZE)}
                onPageChange={setDonationsPage}
              />}
            </section>
          </div>
        );
    }
  };

  return (
    <section className="section-wrap reveal active admin-page admin-page-pad" id="reportRoot">
      <header className="no-print admin-report-header-row">
        <div>
          <p className="admin-page-kicker">{user?.role === 'admin' ? 'Admin' : 'Staff'} · Analytics</p>
          <h1 className="admin-page-title">System Reports</h1>
          <p className="admin-page-subtitle">View structured system-generated operational reports.</p>
        </div>

        {user?.role === 'admin' && (
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
              disabled={isPrinting}
            >
              <i className='bx bx-printer'></i> {isPrinting ? 'Preparing PDF...' : 'Print as PDF'}
            </button>
          </div>
        )}
      </header>

      {/* Report type tab bar */}
      <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { key: 'donations', label: '📥 Intake Summary' },
          { key: 'hair',      label: '✂️ Hair Inventory' },
          { key: 'wigs',      label: '🧵 Wig Monitoring' },
          { key: 'matching',  label: '🤝 Matching & Distribution' },
          { key: 'monetary',  label: '💳 Monetary' },
          { key: 'users',     label: '👥 User Engagement' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setReportType(tab.key);
              setDonationsPage(1); setWigStockPage(1); setMonetaryPage(1); setMatchingPage(1);
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
