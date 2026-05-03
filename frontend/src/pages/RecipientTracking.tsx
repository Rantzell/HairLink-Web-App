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
    <div className="section-wrap reveal active">
      <div className="module-head">
        <h1>Your Requests</h1>
        <p>Track the status of your hair requests and updates.</p>
      </div>

      <div className="tracking-search" style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search by reference, status, or name..." 
          className="search-input"
          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #ead7e8' }}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="tracking-table-wrap">
        <table className="tracking-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading requests...</td></tr>
            ) : filteredRequests.length > 0 ? (
              filteredRequests.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.reference}</strong></td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td>{r.user?.firstName} {r.user?.lastName}</td>
                  <td>
                    <Link to={`/recipient/tracking/${r.reference}`} className="ghost-btn">Details</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="empty-state">
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  {filter ? 'No matching requests found.' : (
                    <>No requests found. <Link to="/recipient/request">Submit your first request</Link></>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipientTracking;
