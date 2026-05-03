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
      <header className="module-head">
        <h1>My Request Tracking</h1>
        <p>Monitor the status of your hair requests and coordination updates.</p>
        <div className="tracking-tools">
          <input 
            type="text" 
            placeholder="Search by reference, status, or name..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <Link className="submit-code-btn" to="/recipient/request" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Submit New Request</Link>
        </div>
      </header>

      <article className="module-card">
        <div className="table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Wig Length</th>
                <th>Wig Color</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</td></tr>
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.reference}</strong></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td>{r.wigLength}</td>
                    <td>{r.wigColor}</td>
                    <td>
                      <Link to={`/recipient/tracking/${r.reference}`} className="ghost-btn">Details</Link>
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
