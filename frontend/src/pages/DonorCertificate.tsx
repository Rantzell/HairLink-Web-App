import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Donation } from '../types';

const DonorCertificate: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  
  const [donations, setDonations] = useState<Donation[]>([]);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await apiClient.get('/internal-api/donations');
        const validDonations = res.data.filter((d: Donation) => 
          ['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(d.status)
        );
        setDonations(validDonations);
        
        if (refParam) {
          const found = validDonations.find((d: Donation) => d.reference === refParam);
          setSelectedDonation(found || validDonations[0] || null);
        } else {
          setSelectedDonation(validDonations[0] || null);
        }
      } catch (err) {
        console.error('Failed to fetch donations for certificate', err);
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
    <section className="section-wrap donor-module-page reveal active" id="certificateRoot">
      <header className="module-head no-print">
        <h1>Donor Certificate</h1>
        <p>Automatically generated once staff confirms receipt of your hair donation.</p>
        <div className="action-row">
          <Link className="ghost-btn" to="/donor/tracking">Back to Tracking</Link>
          {selectedDonation && (
            <button className="soft-btn" type="button" onClick={handlePrint}>Print / Save as PDF</button>
          )}
        </div>
      </header>

      <article className="module-card certificate-shell">
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

                <h1 className="certificate-name">{user?.firstName} {user?.lastName}</h1>

                <div className="cert-body">
                  <p className="certificate-copy">In deep appreciation for your selfless and generous hair donation.</p>
                  <p className="certificate-copy-sub">Your contribution provides hope, confidence, and strength to patients experiencing medical hair loss. Thank you for making a beautiful difference.</p>
                </div>

                <div className="cert-footer">
                  <div className="cert-meta-wrap">
                    <p>Reference: <strong>{selectedDonation.reference}</strong></p>
                    <p>Status: <strong>{selectedDonation.status}</strong></p>
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

            <div className="note-box no-print">
              Certificate is ready. Click "Print / Save as PDF" to download.
              {donations.length > 1 && (
                <div style={{ marginTop: '1rem' }}>
                  <p>View another certificate:</p>
                  <select 
                    onChange={(e) => setSelectedDonation(donations.find(d => d.reference === e.target.value) || null)}
                    value={selectedDonation.reference}
                  >
                    {donations.map(d => (
                      <option key={d.id} value={d.reference}>{d.reference} ({d.status})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="note-box">
            No verified or completed donation record found. Submit a donation and wait for verification to view your certificate.
          </div>
        )}
      </article>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .dash-header, .dash-nav { display: none !important; }
          .dash-main { padding: 0 !important; margin: 0 !important; }
          .section-wrap { padding: 0 !important; }
          .certificate-shell { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .certificate-paper { border: none !important; box-shadow: none !important; }
        }
      `}} />
    </section>
  );
};

export default DonorCertificate;
