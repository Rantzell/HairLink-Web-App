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
  const [matchMode, setMatchMode] = useState<'high' | 'top3' | 'all'>('high');
  const [recipientSearch, setRecipientSearch] = useState('');
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

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="match-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Left: Recipient Selection */}
        <section className="match-left" style={{ borderRight: '1px solid #f2ebf4', paddingRight: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1rem' }}>Select Recipient</h2>
          
          <div style={{ marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="Search recipient..." 
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #ead7e8', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <div className="recipient-facts" style={{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', marginBottom: '1.2rem', border: '1px solid #ead7e8' }}>
            <strong style={{ display: 'block', fontSize: '0.9rem', color: '#ad246d', marginBottom: '0.4rem' }}>
              {selectedRecipient ? `${selectedRecipient.user?.firstName} ${selectedRecipient.user?.lastName}` : 'Select a recipient'}
            </strong>
            <div style={{ fontSize: '0.75rem', color: '#5d4d62', display: 'grid', gap: '0.2rem' }}>
              <span>Wig Size: <strong style={{ color: '#ad246d' }}>{selectedRecipient?.wigLength || 'N/A'}</strong></span>
              <span>Preferred Color: <strong style={{ color: '#ad246d' }}>{selectedRecipient?.wigColor || 'N/A'}</strong></span>
            </div>
          </div>

          <div className="recipient-list" style={{ display: 'grid', gap: '0.5rem' }}>
            {filteredRecipients.map(rec => (
              <button 
                key={rec.id}
                type="button" 
                className={`recipient-btn ${selectedRecipient?.id === rec.id ? 'active' : ''}`}
                onClick={() => setSelectedRecipient(rec)}
                style={{ 
                  textAlign: 'left', 
                  padding: '0.8rem', 
                  borderRadius: '10px', 
                  border: '1px solid #ead7e8', 
                  background: selectedRecipient?.id === rec.id ? '#ad246d' : '#fff', 
                  color: selectedRecipient?.id === rec.id ? '#fff' : '#3b2e43',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{rec.user?.firstName} {rec.user?.lastName}</div>
                <small style={{ opacity: 0.8, fontSize: '0.7rem', fontWeight: 600 }}>{rec.status}</small>
              </button>
            ))}
          </div>
        </section>

        {/* Right: Wig Options */}
        <section className="match-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Available Wigs</h2>
            <div className="match-tools" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#8c7895', fontSize: '0.75rem' }}>Display:</label>
              <select 
                value={matchMode} 
                onChange={e => setMatchMode(e.target.value as any)}
                style={{ padding: '0 0.6rem', borderRadius: '6px', border: '1px solid #ead7e8', height: '28px', fontSize: '0.8rem', color: '#5d4d62' }}
              >
                <option value="high">High Matches (≥ 85%)</option>
                <option value="top3">Top 3 Highest Matches</option>
                <option value="all">All Available Wigs</option>
              </select>
            </div>
          </div>
          
          <p className="match-rule-note" style={{ fontSize: '0.7rem', color: '#8c7895', background: '#fdf7fb', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #f2ebf4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className='bx bx-info-circle' style={{ color: '#ad246d', fontSize: '0.9rem' }}></i>
            Ranking rule: highest compatibility score first. Tie-breaker: oldest in-stock wig first (FIFO).
          </p>

          <div className="wig-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
            {filteredWigs.map(wig => (
              <article key={wig.id} className="wig-option" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1.2rem', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: '0 0 0.2rem 0', color: '#ad246d', fontSize: '0.85rem', fontWeight: 900 }}>Stock #{wig.taskCode}</h4>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#8c7895', fontWeight: 700 }}>AVAILABLE IN STOCK</p>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#5d4d62', display: 'grid', gap: '0.2rem', marginBottom: '1.2rem' }}>
                  <span>Wig Size: <strong style={{ color: '#3b2e43' }}>{wig.targetLength}</strong></span>
                  <span>Color: <strong style={{ color: '#3b2e43' }}>{wig.targetColor}</strong></span>
                </div>
                
                <div style={{ borderTop: '1px solid #f2ebf4', paddingTop: '0.8rem', marginBottom: '1.2rem' }}>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#8c7895', fontWeight: 800, textTransform: 'uppercase' }}>Compatibility</p>
                  <div style={{ fontSize: '1.4rem', fontWeight: 950, color: wig.score >= 85 ? '#28a745' : '#ad246d', marginTop: '0.1rem' }}>
                    {wig.score}%
                  </div>
                </div>

                <button 
                  className="soft-btn" 
                  style={{ 
                    width: '100%', 
                    height: '32px', 
                    fontWeight: 800, 
                    background: '#ad246d', 
                    color: '#fff', 
                    borderRadius: '8px', 
                    border: 'none',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }} 
                  onClick={() => handleMatch(wig.id)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '...' : 'Choose this wig'}
                </button>
              </article>
            ))}
            {filteredWigs.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: '#8c7895', border: '2px dashed #f2ebf4', borderRadius: '15px', background: '#fafafa' }}>
                <i className='bx bx-search-alt' style={{ fontSize: '2rem', display: 'block', marginBottom: '0.8rem', opacity: 0.3 }}></i>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>No high-match wig found.</p>
              </div>
            )}
          </div>
        </section>
      </article>
    </section>
  );
};


export default StaffMatching;
