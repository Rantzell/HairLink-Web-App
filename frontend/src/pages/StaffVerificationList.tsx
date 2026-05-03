import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const StaffVerificationList: React.FC = () => {
  const { type } = useParams<{ type: 'donor' | 'recipient' | 'monetary' }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const endpoint = type === 'donor' 
          ? '/internal-api/staff/donor-verification' 
          : type === 'recipient'
            ? '/internal-api/staff/recipient-verification'
            : '/internal-api/staff/monetary-verification';
            
        const res = await apiClient.get(endpoint);
        setItems(res.data);
      } catch (err) {
        console.error('Failed to fetch verification items', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [type]);

  const title = type === 'donor' ? 'Hair Donations' : type === 'recipient' ? 'Recipient Requests' : 'Monetary Donations';

  return (
    <div className="section-wrap reveal active staff-page">
      <header className="module-head">
        <h1>{title} Verification</h1>
        <p>Queue of pending {type} submissions awaiting review.</p>
        <div className="action-row">
          <Link className="ghost-btn" to="/staff/dashboard">Back to Workspace</Link>
        </div>
      </header>

      <div className="tracking-table-wrap">
        <table className="tracking-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date</th>
              <th>User</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading verification queue...</td></tr>
            ) : items.length > 0 ? (
              items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.reference || item.reference_number}</strong></td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>{item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}</td>
                  <td><StatusPill status={item.status} /></td>
                  <td>
                    <Link to={`/staff/verification/${type}/${item.reference || item.reference_number}`} className="ghost-btn">Review</Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No pending {type} submissions in the queue.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffVerificationList;
