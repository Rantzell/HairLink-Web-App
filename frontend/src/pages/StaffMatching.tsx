import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { HairRequest, WigProduction } from '../types';

// Matching Logic (Mirroring the service)
export function calculateCompatibility(
  request: { wigLength?: string | null; wigColor?: string | null },
  wig: { targetLength: string; targetColor: string }
): number {
  let score = 0;
  const normalizeSize = (val: string | null | undefined): number => {
    if (!val) return 0;
    const s = val.toLowerCase().trim();
    if (s.includes('10 to 14') || s === 'short') return 1;
    if (s.includes('15 to 20') || s === 'medium') return 2;
    if (s.includes('more than 20') || s === 'long') return 3;
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
  const [recipients, setRecipients] = useState<HairRequest[]>([]);
  const [wigs, setWigs] = useState<WigProduction[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<HairRequest | null>(null);
  const [matchMode, setMatchMode] = useState<'high' | 'top3' | 'all'>('high');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMatchingData = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/rule-matching');
        setRecipients(res.data.recipients);
        setWigs(res.data.wigs);
        if (res.data.recipients.length > 0) setSelectedRecipient(res.data.recipients[0]);
      } catch (err) {
        console.error('Failed to fetch matching data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatchingData();
  }, []);

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
    if (matchMode === 'all') return scoredWigs;
    if (matchMode === 'top3') return scoredWigs.slice(0, 3);
    return scoredWigs.filter(w => w.score >= 85);
  }, [scoredWigs, matchMode]);

  const handleMatch = async (wigId: string) => {
    if (!selectedRecipient) return;
    if (!window.confirm('Confirm matching this wig to the recipient?')) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/staff/match-wig', {
        request_reference: selectedRecipient.reference,
        wig_id: wigId
      });
      alert('Matching successful!');
      navigate('/staff/tracking');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Matching failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="section-wrap">Loading matching workspace...</div>;

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="match-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        <section className="match-left" style={{ borderRight: '1px solid #ead7e8', paddingRight: '1.5rem' }}>
          <h2>Select Recipient</h2>
          
          <div className="recipient-facts" style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #f2ebf4' }}>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#ad246d', marginBottom: '0.5rem' }}>
              {selectedRecipient ? `${selectedRecipient.user?.firstName} ${selectedRecipient.user?.lastName}` : 'Select a recipient'}
            </strong>
            <div style={{ fontSize: '0.85rem', color: '#5d4d62' }}>
              <p style={{ margin: 0 }}>Size: <strong>{selectedRecipient?.wigLength || 'N/A'}</strong></p>
              <p style={{ margin: 0 }}>Color: <strong>{selectedRecipient?.wigColor || 'N/A'}</strong></p>
            </div>
          </div>

          <div className="recipient-list" style={{ display: 'grid', gap: '0.5rem' }}>
            {recipients.map(rec => (
              <button 
                key={rec.id}
                type="button" 
                className={`recipient-btn ${selectedRecipient?.id === rec.id ? 'active' : ''}`}
                onClick={() => setSelectedRecipient(rec)}
                style={{ textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #ead7e8', background: selectedRecipient?.id === rec.id ? '#ad246d' : '#fff', color: selectedRecipient?.id === rec.id ? '#fff' : '#3b2e43' }}
              >
                <div style={{ fontWeight: 800 }}>{rec.user?.firstName} {rec.user?.lastName}</div>
                <small style={{ opacity: 0.8 }}>{rec.status}</small>
              </button>
            ))}
            {recipients.length === 0 && <p>No recipients pending matching.</p>}
          </div>
        </section>

        <section className="match-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Available Wigs</h2>
            <div className="match-tools">
              <label style={{ marginRight: '0.5rem', fontWeight: 700, color: '#8c7895', fontSize: '0.8rem' }}>Display:</label>
              <select 
                value={matchMode} 
                onChange={e => setMatchMode(e.target.value as any)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #ead7e8' }}
              >
                <option value="high">High Matches (≥ 85%)</option>
                <option value="top3">Top 3 Highest Matches</option>
                <option value="all">All Available Wigs</option>
              </select>
            </div>
          </div>
          
          <p className="match-rule-note" style={{ fontSize: '0.8rem', color: '#8c7895', background: '#f8f9fa', padding: '0.5rem 1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            Ranking rule: highest compatibility score first. Tie-breaker: oldest in-stock wig first (FIFO).
          </p>

          <div className="wig-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {filteredWigs.map(wig => (
              <article key={wig.id} className="wig-option" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1.25rem', position: 'relative' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#ad246d' }}>Stock #{wig.taskCode}</h4>
                <div style={{ fontSize: '0.85rem', color: '#5d4d62', marginBottom: '1rem' }}>
                  <p style={{ margin: 0 }}>Size: <strong>{wig.targetLength}</strong></p>
                  <p style={{ margin: 0 }}>Color: <strong>{wig.targetColor}</strong></p>
                </div>
                
                <div style={{ borderTop: '1px solid #f2ebf4', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#8c7895', fontWeight: 800 }}>COMPATIBILITY</p>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: wig.score >= 85 ? '#28a745' : '#ad246d' }}>{wig.score}%</div>
                </div>

                <button 
                  className="soft-btn" 
                  style={{ width: '100%', padding: '0.6rem' }} 
                  onClick={() => handleMatch(wig.id)}
                  disabled={isSubmitting}
                >
                  Choose this wig
                </button>
              </article>
            ))}
            {filteredWigs.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#8c7895', border: '2px dashed #f2ebf4', borderRadius: '16px' }}>
                No high-match wig found for the current recipient. Switch to "All Available Wigs" to review more options.
              </div>
            )}
          </div>
        </section>
      </article>
    </section>
  );
};

export default StaffMatching;
