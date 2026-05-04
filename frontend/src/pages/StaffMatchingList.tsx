import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const StaffMatchingList: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/recipient-matching-list');
        setMatches(res.data.matches || []);
      } catch (err) {
        console.error('Failed to fetch match history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(m => 
    `${m.user?.firstName} ${m.user?.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
    m.reference.toLowerCase().includes(filter.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="staff-block" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '2rem', boxShadow: '0 10px 40px rgba(173, 36, 109, 0.04)' }}>
        <div className="staff-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <div style={{ flex: '1' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Recipient Matching List</h2>
          </div>
          <div className="staff-tools" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <i className='bx bx-search' style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8c7895' }}></i>
              <input 
                type="text" 
                placeholder="Search matching record..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ height: '32px', padding: '0 10px 0 32px', borderRadius: '8px', border: '1px solid #ead7e8', fontSize: '0.85rem', width: '220px' }}
              />
            </div>
            <button 
              type="button" 
              className="ghost-btn" 
              onClick={handlePrint}
              style={{ height: '32px', padding: '0 1rem', fontWeight: 800, border: '1px solid #ead7e8', borderRadius: '8px', fontSize: '0.75rem', color: '#5d4d62', background: '#fff', cursor: 'pointer' }}
            >
              Print List
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ border: '1px solid #f2ebf4', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="staff-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' }}>
                <th style={{ padding: '1.2rem 1rem', textAlign: 'left', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Recipient Name</th>
                <th style={{ padding: '1.2rem 1rem', textAlign: 'left', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Match Ref</th>
                <th style={{ padding: '1.2rem 1rem', textAlign: 'left', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Current Status</th>
                <th style={{ padding: '1.2rem 1rem', textAlign: 'left', color: '#ad246d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Date Matched</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f2ebf4', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '1.2rem 1rem', fontWeight: 700, color: '#3b2e43' }}>{m.user?.firstName} {m.user?.lastName}</td>
                  <td style={{ padding: '1.2rem 1rem', color: '#5d4d62', fontFamily: 'monospace', fontWeight: 600 }}>{m.reference}</td>
                  <td style={{ padding: '1.2rem 1rem' }}>
                    <span style={{ padding: '0.4rem 0.8rem', borderRadius: '20px', background: '#fdf7fb', color: '#ad246d', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #ead7e8' }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '1.2rem 1rem', color: '#8c7895' }}>{new Date(m.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredMatches.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#8c7895', fontStyle: 'italic' }}>
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
};

export default StaffMatchingList;
