import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/StaffMatching.css';

// Matching Logic (Mirroring the service)
export function calculateCompatibility(
  request: { wigLength?: string | null; wigColor?: string | null },
  wig: { targetLength: string; targetColor: string }
): number {
  let score = 0;
  const normalizeSize = (val: string | null | undefined): number => {
    if (!val) return 0;
    const s = val.toLowerCase().trim();
    if (s.includes('10 to 14') || s === 'short' || s.includes('10 inches') || s.includes('12 inches')) return 1;
    if (s.includes('15 to 20') || s === 'medium' || s.includes('14 inches') || s.includes('16 inches')) return 2;
    if (s.includes('more than 20') || s === 'long' || s.includes('18 inches') || s.includes('20 inches')) return 3;
    return 0;
  };
  const reqSize = normalizeSize(request.wigLength);
  const wigSize = normalizeSize(wig.targetLength);
  if (reqSize > 0 && wigSize > 0) {
    if (reqSize === wigSize) score += 40;
    else if (Math.abs(reqSize - wigSize) === 1) score += 20;
  }
  const reqColor = (request.wigColor || '').toLowerCase().trim();
  const wigColor = wig.targetColor.toLowerCase().trim();
  if (reqColor === wigColor) score += 40;
  else {
    const similar: [string, string][] = [['black', 'brown'], ['brown', 'red'], ['blonde', 'gray'], ['gray', 'white']];
    for (const [a, b] of similar) {
      if ((reqColor.includes(a) && wigColor.includes(b)) || (reqColor.includes(b) && wigColor.includes(a))) {
        score += 20; break;
      }
    }
  }
  score += 20;
  return score;
}

const StaffMatching: React.FC = () => {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<any[]>([]);
  const [wigs, setWigs] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);
  const [pendingWigId, setPendingWigId] = useState<string | null>(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetRef = queryParams.get('reference');

  useEffect(() => {
    const fetchMatchingData = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/rule-matching');
        setRecipients(res.data.recipients);
        setWigs(res.data.wigs);
        
        // Auto-select based on reference if provided, otherwise first recipient
        if (res.data.recipients.length > 0) {
          const matched = targetRef 
            ? res.data.recipients.find((r: any) => r.reference === targetRef) 
            : res.data.recipients[0];
          setSelectedRecipient(matched || res.data.recipients[0]);
        }
      } catch (err) {
        console.error('Failed to fetch matching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchingData();
  }, [targetRef]);

  const filteredRecipients = recipients.filter(r => 
    `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  const scoredWigs = useMemo(() => {
    if (!selectedRecipient) return [];
    return wigs
      .map(wig => ({
        ...wig,
        score: calculateCompatibility(selectedRecipient, wig)
      }))
      .sort((a, b) => b.score - a.score || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }, [selectedRecipient, wigs]);

  const filteredWigs = useMemo(() => {
    return scoredWigs.filter(w => w.score >= 85);
  }, [scoredWigs]);

  const handleMatch = (wigId: string) => {
    if (!selectedRecipient) return;
    setPendingWigId(wigId);
    setShowMatchConfirm(true);
  };

  const doMatch = async () => {
    if (!selectedRecipient || !pendingWigId) return;
    setShowMatchConfirm(false);
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/staff/match-wig', {
        request_reference: selectedRecipient.reference,
        wig_id: pendingWigId
      });
      alert('Matching successful!');
      navigate('/staff/tracking');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Matching failed');
    } finally {
      setIsSubmitting(false);
      setPendingWigId(null);
    }
  };

  if (loading) return <div className="section-wrap">Loading matching data...</div>;

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="match-layout">
        {/* Left: Recipient Selection */}
        <section className="match-left">
          <h2 className="match-title">Select Recipient</h2>
          
          <div className="match-search-container">
            <input 
              type="text" 
              placeholder="Search recipient..." 
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="match-search-input"
            />
          </div>

          <div className="recipient-facts">
            <strong className="recipient-name">
              {selectedRecipient ? `${selectedRecipient.user?.firstName} ${selectedRecipient.user?.lastName}` : 'Select a recipient'}
            </strong>
            <div className="recipient-specs">
              <span>Wig Size: <strong className="recipient-spec-value">{selectedRecipient?.wigLength || 'N/A'}</strong></span>
              <span>Preferred Color: <strong className="recipient-spec-value">{selectedRecipient?.wigColor || 'N/A'}</strong></span>
            </div>
          </div>

          <div className="recipient-list">
            {filteredRecipients.map(rec => (
              <button 
                key={rec.id}
                type="button" 
                className={`recipient-btn ${selectedRecipient?.id === rec.id ? 'active' : ''}`}
                onClick={() => setSelectedRecipient(rec)}
                
              >
                <div className="recipient-btn-name">{rec.user?.firstName} {rec.user?.lastName}</div>
                <small className="recipient-btn-status">{rec.status}</small>
              </button>
            ))}
          </div>
        </section>

        {/* Right: Wig Options */}
        <section className="match-right">
          <div className="match-right-header">
            <h2 className="match-title match-title-margin-0">Available Wigs</h2>
          </div>

          <div className="wig-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
            {filteredWigs.map(wig => (
              <article key={wig.id} className="wig-option" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1.2rem', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div className="wig-option-header">
                  <h4 className="wig-option-title">Stock #{wig.taskCode}</h4>
                  <p className="wig-option-subtitle">AVAILABLE IN STOCK</p>
                </div>

                <div className="wig-option-specs">
                  <span>Wig Size: <strong className="wig-spec-value">{wig.targetLength}</strong></span>
                  <span>Color: <strong className="wig-spec-value">{wig.targetColor}</strong></span>
                </div>
                
                <div className="wig-option-score-wrap">
                  <p className="wig-score-label">Compatibility</p>
                  <div className="wig-score-value" style={{ color: wig.score >= 85 ? "#28a745" : "#ad246d" }}>
                    {wig.score}%
                  </div>
                </div>

                <button 
                  className="soft-btn wig-choose-btn" 
                  onClick={() => handleMatch(wig.id)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '...' : 'Choose this wig'}
                </button>
              </article>
            ))}
            {filteredWigs.length === 0 && (
              <div className="wig-no-match">
                <i className="bx bx-search-alt wig-no-match-icon"></i>
                <p className="wig-no-match-text">No high-match wig found.</p>
              </div>
            )}
          </div>
        </section>
      </article>

      <ConfirmModal
        isOpen={showMatchConfirm}
        onClose={() => { setShowMatchConfirm(false); setPendingWigId(null); }}
        onConfirm={doMatch}
        title="Confirm Wig Match"
        message={`Match this wig to ${selectedRecipient ? `${selectedRecipient.user?.firstName} ${selectedRecipient.user?.lastName}` : 'the selected recipient'}? This will update the request status to Matched.`}
        confirmText="Yes, Assign Wig"
        isConfirming={isSubmitting}
      />
    </section>
  );
};


export default StaffMatching;
