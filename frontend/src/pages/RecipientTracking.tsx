import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { HairRequest } from '../types';

const RecipientTracking: React.FC = () => {
  const [requests, setRequests] = useState<HairRequest[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await apiClient.get('/internal-api/requests');
        setRequests(res.data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(r => 
    r.reference.toLowerCase().includes(filter.toLowerCase()) ||
    r.status.toLowerCase().includes(filter.toLowerCase()) ||
    (r.user?.firstName + ' ' + r.user?.lastName).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>My Request Tracking</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.2rem' }}>Monitor the status of your hair requests and coordination updates.</p>
        <div className="tracking-tools" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search reference, status..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #ead7e8', fontSize: '0.8rem', width: '250px' }}
          />
          <Link 
            to="/recipient/request" 
            style={{ 
              textDecoration: 'none', 
              fontSize: '0.75rem', 
              background: '#ad246d', 
              color: '#fff', 
              padding: '0.4rem 1.2rem', 
              borderRadius: '50px', 
              fontWeight: 800,
              display: 'inline-block'
            }}
          >
            Submit New Request
          </Link>
        </div>
      </header>

      <article className="module-card">
        <div className="table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Reference</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Submitted</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Status</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Wig Length</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Wig Color</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</td></tr>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.85rem' }}><strong>{r.reference}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ fontSize: '0.85rem' }}>{r.wigLength}</td>
                    <td style={{ fontSize: '0.85rem' }}>{r.wigColor}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                        <Link 
                          to={`/recipient/tracking/${r.reference}`} 
                          style={{ 
                            padding: '0.35rem 0.8rem', 
                            fontSize: '0.7rem', 
                            background: '#fff', 
                            color: '#ad246d', 
                            border: '1.5px solid #ead7e8', 
                            borderRadius: '8px', 
                            textDecoration: 'none',
                            fontWeight: 700,
                            display: 'inline-block'
                          }}
                        >
                          Details
                        </Link>
                        {r.status === 'In Transit' && (
                          <button 
                            style={{ 
                              padding: '0.35rem 0.8rem', 
                              fontSize: '0.7rem', 
                              background: '#ad246d', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: '50px', 
                              fontWeight: 800,
                              cursor: 'pointer' 
                            }}
                            onClick={async () => {
                              if (!window.confirm('Confirm you have received your wig?')) return;
                              try {
                                await apiClient.post(`/internal-api/requests/${r.reference}/confirm-received`);
                                window.location.reload();
                              } catch (err) {
                                alert('Failed to confirm receipt.');
                              }
                            }}
                          >
                            Received
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#7a687f' }}>
                    {filter ? 'No matching requests found.' : 'No request records yet. Submit your first hair request to begin tracking.'}
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

export default RecipientTracking;
