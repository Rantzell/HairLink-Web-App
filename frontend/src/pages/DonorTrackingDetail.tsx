import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { Donation } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { getPublicUrl } from '../lib/storage';
import ConfirmModal from '../components/ConfirmModal';

function todayMin(): string {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

const DonorTrackingDetail: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryLink, setDeliveryLink] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await apiClient.get(`/internal-api/donations/${reference}`);
      setDonation(res.data);
      setDeliveryLink(res.data.donorDeliveryLink || '');
    } catch (err) {
      console.error('Failed to fetch donation detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [reference]);

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryLink.trim()) return;
    setShowConfirm(true);
  };

  const doSubmitLink = async () => {
    setShowConfirm(false);
    setIsSubmittingLink(true);
    setLinkError('');
    setLinkSuccess(false);
    try {
      await apiClient.post(`/internal-api/donations/${reference}/delivery-link`, { 
        donor_delivery_link: deliveryLink 
      });
      setLinkSuccess(true);
      setTimeout(() => setLinkSuccess(false), 3000);
      fetchDetail();
    } catch (err: any) {
      setLinkError(err.response?.data?.message || 'Failed to submit link');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleScheduleDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate) return;
    setIsScheduling(true);
    setScheduleError('');
    try {
      const [y, m, d] = scheduleDate.split('-').map(Number);
      const localMidnight = new Date(y, m - 1, d); // local timezone midnight
      await apiClient.post(`/internal-api/donations/${reference}/schedule-delivery`, {
        scheduled_delivery_at: localMidnight.toISOString(),
      });
      setShowRescheduleForm(false);
      setScheduleDate('');
      fetchDetail();
    } catch (err: any) {
      setScheduleError(err.response?.data?.error || err.response?.data?.message || 'Failed to schedule delivery');
    } finally {
      setIsScheduling(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!donation) return <div className="section-wrap">Donation not found.</div>;

  const scheduledAt = donation.scheduledDeliveryAt ? new Date(donation.scheduledDeliveryAt) : null;
  // Compare local date strings (YYYY-MM-DD) so that a date like "2026-06-12" stored as
  // UTC midnight (= 8 AM PHT) still counts as "due" from 12:00 AM local time onward.
  const deliveryDue = !!scheduledAt && (() => {
    const todayStr = new Date().toLocaleDateString('en-CA');          // local YYYY-MM-DD
    const scheduledStr = scheduledAt.toLocaleDateString('en-CA');     // local YYYY-MM-DD
    return scheduledStr <= todayStr;
  })();

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>Donation Tracking Detail</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.2rem' }}>Reference: <strong>{donation.reference}</strong></p>
        <div className="action-row" style={{ marginTop: '1rem' }}>
          <Link 
            to="/donor/tracking" 
            style={{ 
              textDecoration: 'none', 
              fontSize: '0.7rem', 
              background: '#fff', 
              color: '#ad246d', 
              padding: '0.35rem 0.8rem', 
              borderRadius: '8px', 
              border: '1.5px solid #ead7e8', 
              fontWeight: 700,
              display: 'inline-block'
            }}
          >
            Back to Tracking List
          </Link>
        </div>
      </header>

      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-hash' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Reference</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{donation.reference}</strong>
          </div>
        </div>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-info-circle' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Status</small>
            <div style={{ marginTop: '0.2rem' }}><StatusPill status={donation.status} /></div>
          </div>
        </div>
        <div className="summary-item" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
            <i className='bx bx-calendar' style={{ color: '#ad246d', fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <small style={{ display: 'block', color: '#8c7895', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>Submitted</small>
            <strong style={{ color: '#3b2e43', fontSize: '0.85rem' }}>{new Date(donation.createdAt).toLocaleDateString()}</strong>
          </div>
        </div>
      </div>

      <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1rem', alignItems: 'start' }}>
        <div className="module-card" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <i className='bx bx-git-commit' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
            <h3 style={{ margin: 0 }}>Donation Roadmap</h3>
          </div>
          <ul className="timeline" style={{ paddingLeft: '0.5rem', listStyle: 'none' }}>
            {donation.statusHistories?.map((history, i) => (
              <li key={i} className="timeline-item" style={{ borderLeft: '2px solid #f2ebf4', paddingLeft: '1.5rem', paddingBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-7px', top: 0, width: '12px', height: '12px', background: '#ad246d', borderRadius: '50%', border: '2px solid #fff' }}></div>
                <div className="timeline-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ad246d' }}>{history.status}</strong>
                  <time style={{ fontSize: '0.75rem', color: '#8c7895' }}>{new Date(history.createdAt).toLocaleString()}</time>
                </div>
                <div className="timeline-desc" style={{ background: '#fdf7fb', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #f2ebf4', fontSize: '0.85rem', color: '#4d3f56' }}>
                  {history.notes || `Status changed to ${history.status}`}
                </div>
              </li>
            ))}
          </ul>

          {donation.status === 'Verified' && !deliveryDue && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fdf7fb', border: '1.5px dashed #ad246d', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <i className='bx bx-calendar-event' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
                <h4 style={{ margin: 0, color: '#3b2e43' }}>
                  {scheduledAt ? 'Delivery Date Scheduled' : 'Schedule Your Hair Delivery'}
                </h4>
              </div>

              {scheduledAt && !showRescheduleForm ? (
                <>
                  <p style={{ fontSize: '0.85rem', color: '#4d3f56', marginBottom: '0.75rem' }}>
                    You're scheduled to send your hair donation on{' '}
                    <strong style={{ color: '#ad246d' }}>
                      {scheduledAt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </strong>.
                    On that day, this page will let you submit your delivery tracking link.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowRescheduleForm(true); setScheduleDate(''); }}
                    className="soft-btn"
                    style={{ background: '#fff', color: '#ad246d', border: '1.5px solid #ead7e8', padding: '0.5rem 1.25rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Reschedule
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#8c7895', marginBottom: '1rem' }}>
                    Pick the date you plan to send your donated hair to us. We'll notify our staff right away, and on the day you choose, you'll be able to submit your delivery tracking link here.
                  </p>
                  <form onSubmit={handleScheduleDelivery} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      min={todayMin()}
                      required
                      style={{ flex: 1, minWidth: '160px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.85rem' }}
                    />
                    <button
                      type="submit"
                      disabled={isScheduling}
                      className="soft-btn"
                      style={{ background: '#ad246d', color: '#fff', border: 'none', padding: '0 1.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {isScheduling ? '...' : 'Confirm Date'}
                    </button>
                    {scheduledAt && (
                      <button
                        type="button"
                        onClick={() => setShowRescheduleForm(false)}
                        className="soft-btn"
                        style={{ background: '#fff', color: '#8c7895', border: '1.5px solid #ead7e8', padding: '0 1.25rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    )}
                  </form>
                  {scheduleError && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#e03c3c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className='bx bx-error-circle'></i> {scheduleError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {donation.status === 'Verified' && deliveryDue && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fdf7fb', border: '1.5px dashed #ad246d', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <i className='bx bx-package' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
                <h4 style={{ margin: 0, color: '#3b2e43' }}>Submit Delivery Tracking Link</h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#8c7895', marginBottom: '1rem' }}>
                Today is your scheduled delivery date! Please provide the tracking URL or delivery reference link from your courier (e.g., Grab, Lalamove, J&T) so our staff can monitor the arrival.
              </p>
              <form onSubmit={handleSubmitLink} style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="url"
                  placeholder="https://tracking-link.com/..."
                  value={deliveryLink}
                  onChange={e => setDeliveryLink(e.target.value)}
                  required
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.85rem' }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingLink}
                  className="soft-btn"
                  style={{ background: '#ad246d', color: '#fff', border: 'none', padding: '0 1.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {isSubmittingLink ? '...' : donation.donorDeliveryLink ? 'Update Link' : 'Submit Link'}
                </button>
              </form>
              {linkSuccess && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className='bx bx-check-circle'></i> Delivery link submitted successfully!
                </p>
              )}
              {linkError && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#e03c3c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className='bx bx-error-circle'></i> {linkError}
                </p>
              )}
            </div>
          )}

          {donation.donorDeliveryLink && donation.status === 'Verified' && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1.25rem', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem'
            }}>
              <div style={{ background: '#fff', width: '40px', height: '40px', borderRadius: '8px', display: 'grid', placeItems: 'center', border: '1px solid #dbeafe', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.05)' }}>
                <i className='bx bx-link-external' style={{ color: '#3b82f6', fontSize: '1.2rem' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <small style={{ display: 'block', color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '2px' }}>Delivery Link Sent</small>
                <a 
                  href={donation.donorDeliveryLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ color: '#3b82f6', fontSize: '0.88rem', textDecoration: 'underline', fontWeight: 700 }}
                >
                  Click to track shipment
                </a>
              </div>
            </div>
          )}

          <div className="action-row" style={{ marginTop: '1rem', borderTop: '1px dashed #f2ebf4', paddingTop: '1rem' }}>
            {['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(donation.status) && (
              <Link className="soft-btn" to={`/donor/certificate?ref=${donation.reference}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #ad246d 0%, #cf2f84 100%)', color: '#fff', border: 'none' }}>
                <i className='bx bx-award'></i> Download Certificate
              </Link>
            )}
          </div>
        </div>

        <div className="side-box" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <i className='bx bx-cut' style={{ color: '#ad246d', fontSize: '1.4rem' }}></i>
              <h3 style={{ margin: 0 }}>Hair Info</h3>
            </div>
            <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.88rem' }}>
              <p style={{ margin: 0 }}><strong>Length:</strong> {donation.hairLength}</p>
              <p style={{ margin: 0, marginBottom: '0.5rem' }}><strong>Color:</strong> {donation.hairColor}</p>
              <div style={{ background: '#fdf7fb', padding: '0.5rem', borderRadius: '8px', border: '1px solid #f2ebf4', fontSize: '0.82rem', fontStyle: 'italic', color: '#665772' }}>
                "{donation.reason || 'No reason provided'}"
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <small style={{ display: 'block', marginBottom: '0.5rem', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>Donation Reference Photo</small>
            <div id="photoPreview" style={{ width: '200px', height: '200px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', background: '#fff5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(173, 36, 109, 0.05)', border: '1px solid #ead7e8' }}>
              {donation.photoFront ? (
                <a href={getPublicUrl('hairlink', donation.photoFront) || '#'} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                  <img 
                    src={getPublicUrl('hairlink', donation.photoFront) || ''} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt="Donation" 
                  />
                </a>
              ) : (
                <i className='bx bx-image' style={{ fontSize: '3rem', color: '#ead7e8' }}></i>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={doSubmitLink}
        title="Submit Delivery Link"
        message="Are you sure you want to submit this delivery tracking link? Our staff will use it to monitor the arrival of your donation."
        confirmText={donation?.donorDeliveryLink ? 'Yes, Update Link' : 'Yes, Submit Link'}
        isConfirming={isSubmittingLink}
      />
    </section>
  );
};

export default DonorTrackingDetail;
