import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Donation } from '../types';

// Static demo removed

const DonorCertificate: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  
  const [donations, setDonations] = useState<any[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [rawDonations, setRawDonations] = useState<any[]>([]);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await apiClient.get('/internal-api/donations');
        setRawDonations(res.data);
        const validDonations = res.data.filter((d: Donation) => 
          ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(d.status)
        );
        
        if (validDonations.length > 0) {
          setDonations(validDonations);
          if (refParam) {
            const found = validDonations.find((d: Donation) => d.reference === refParam);
            setSelectedDonation(found || validDonations[0]);
          } else {
            setSelectedDonation(validDonations[0]);
          }
        } else {
          setSelectedDonation(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch donations for certificate', err);
        const serverError = err.response?.data?.message || err.response?.data?.error || err.message || String(err);
        setErrorMsg(serverError);
        setSelectedDonation(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, [refParam]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="section-wrap">Loading...</div>;

  return (
    <section className="section-wrap donor-module-page reveal active staff-page" id="certificateRoot" style={{ padding: '1rem' }}>
      <header className="module-head no-print" style={{ marginBottom: '0' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Donor Certificate</h1>
        <p style={{ fontSize: '0.75rem', color: '#8c7895', marginTop: '0.1rem' }}>Automatically generated once staff confirms receipt of your hair donation.</p>
        <div className="action-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem' }}>
          <Link 
            to="/donor/tracking"
            style={{ 
              height: '32px', 
              padding: '0 1rem', 
              borderRadius: '8px', 
              border: '1px solid #ead7e8', 
              color: '#ad246d', 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center',
              background: '#fff',
              transition: 'all 0.2s ease'
            }}
          >
            Back to Tracking
          </Link>
          {selectedDonation && (
            <button 
              type="button" 
              onClick={handlePrint}
              style={{ 
                height: '32px', 
                padding: '0 1rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: '#ad246d', 
                color: '#fff', 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(173, 36, 109, 0.2)'
              }}
            >
              <i className='bx bx-printer'></i> Print / Save as PDF
            </button>
          )}
        </div>
      </header>

      <article className="module-card certificate-shell" style={{ 
        background: '#fff', 
        border: '1px solid #ead7e8', 
        borderRadius: '15px', 
        padding: '1rem', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        marginTop: '0.4rem'
      }}>
        {selectedDonation ? (
          <>
            <div className="certificate-paper" id="certificatePaper">
              <div className="certificate-inner">
                <div className="cert-header">
                  <div className="cert-logos">
                    <img src="/assets/images/landing/pink-ribbon.png" className="cert-logo-main" alt="HairLink Logo" />
                    <img src="/assets/images/landing/logo.jpg" className="cert-logo-sufc" alt="Strand Up For Cancer Logo" />
                  </div>
                  <h2 className="certificate-title">CERTIFICATE OF RECOGNITION</h2>
                  <p className="certificate-subtitle">This certificate is proudly presented to</p>
                </div>

                <h1 className="certificate-name" style={{ fontSize: '2.5rem', fontWeight: 900 }}>{user?.firstName || 'Donor'} {user?.lastName || 'Demo'}</h1>

                <div className="cert-body">
                  <p className="certificate-copy">In deep appreciation for your selfless and generous hair donation.</p>
                  <p className="certificate-copy-sub">Your contribution provides hope, confidence, and strength to patients experiencing medical hair loss. Thank you for making a beautiful difference.</p>
                </div>

                <div className="cert-footer">
                  <div className="cert-meta-wrap">
                    <p>Reference: <strong>{selectedDonation.reference}</strong></p>
                  </div>
                  
                  <div className="cert-signature">
                    <div className="signature-line"></div>
                    <p>HairLink Foundation</p>
                    <span>Authorized Signature</span>
                  </div>

                  <div className="cert-meta-wrap right-meta">
                    <p>Cert. No: <strong>{selectedDonation.certificateNo || 'Pending'}</strong></p>
                    <p>Date: <strong>{new Date(selectedDonation.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="note-box no-print" style={{ 
              background: '#fdf7fb', 
              border: '1px solid #ead7e8', 
              color: '#ad246d', 
              padding: '0.75rem 1rem', 
              borderRadius: '10px', 
              marginTop: '1rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className='bx bx-check-circle' style={{ fontSize: '1rem' }}></i>
              Certificate is ready. Click "Print / Save as PDF" to download.
              {donations.length > 1 && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700 }}>Switch:</span>
                  <select 
                    style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid #ead7e8', fontSize: '0.7rem' }}
                    onChange={(e) => setSelectedDonation(donations.find(d => d.reference === e.target.value) || null)}
                    value={selectedDonation.reference}
                  >
                    {donations.map(d => (
                      <option key={d.id} value={d.reference}>{d.reference}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="note-box" style={{ padding: '2rem', textAlign: 'center', color: '#8c7895', fontSize: '0.8rem' }}>
            <p>No verified or completed donation record found. Submit a donation and wait for verification to view your certificate.</p>
            {(rawDonations.length > 0 || errorMsg) && (
              <div style={{ marginTop: '1rem', textAlign: 'left', background: '#fdf7fb', border: '1px solid #ead7e8', padding: '1rem', borderRadius: '8px', color: '#4d3f56', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <div style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#ad246d' }}>DEBUG DIAGNOSTICS:</div>
                {errorMsg && <div style={{ color: '#e03c3c', marginBottom: '0.5rem' }}>Error: {errorMsg}</div>}
                <div>Raw donations count: {rawDonations.length}</div>
                <div style={{ marginTop: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {rawDonations.map((d: any) => (
                    <div key={d.id} style={{ borderBottom: '1px solid #f2ebf4', padding: '0.2rem 0' }}>
                      - Ref: {d.reference}, Status: {d.status}, CertNo: {d.certificateNo}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </article>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden; }
          
          /* Show only the certificate and its children */
          #certificatePaper, #certificatePaper * { visibility: visible; }
          
          /* Reset layout for printing */
          #certificatePaper { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0 !important; 
            padding: 0 !important; 
            border: none !important; 
            box-shadow: none !important; 
          }

          /* Explicitly hide non-print elements */
          .no-print, .dash-header, .dash-nav, .ghost-btn, .soft-btn, .action-row, .module-head, .note-box { 
            display: none !important; 
          }
          
          /* Remove page backgrounds and margins */
          @page { margin: 0; size: auto; }
          body { background: #fff !important; }
        }
      `}} />
    </section>
  );
};

export default DonorCertificate;
