import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';

const StaffVerificationList: React.FC = () => {
  const { type } = useParams<{ type: 'donor' | 'recipient' | 'monetary' }>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

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
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [type]);

  const filteredItems = items.filter(item => {
    const name = item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || '');
    const matchesSearch = (item.reference || item.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const title = type === 'donor' ? 'Hair Donations' : type === 'recipient' ? 'Recipient Requests' : 'Monetary Donations';

  return (
    <div className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>{title} Verification Queue</h2>
          <div className="staff-tools" style={{ display: 'flex', gap: '0.8rem', flex: '1', justifyContent: 'flex-end', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: '1' }}>
              <i className='bx bx-search' style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d' }}></i>
              <input 
                type="text" 
                placeholder="Search recipient or reference" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0.9rem' }}
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #ead7e8', background: '#fff', fontSize: '0.9rem', minWidth: '140px' }}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <div className="tracking-table-wrap" style={{ background: '#fff', borderRadius: '15px', border: '1px solid #f2ebf4', overflow: 'hidden' }}>
          <table className="tracking-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fdf7fb' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#8c7895' }}>
                  <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                  Loading verification queue...
                </td></tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid #f2ebf4' }}>
                    <td style={{ padding: '1.2rem 1rem' }}><strong style={{ color: '#3b2e43' }}>{item.reference || item.referenceNumber}</strong></td>
                    <td style={{ padding: '1.2rem 1rem', color: '#5d4d62', fontSize: '0.9rem' }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '1.2rem 1rem', color: '#3b2e43', fontWeight: 600 }}>{item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}</td>
                    <td style={{ padding: '1.2rem 1rem' }}><StatusPill status={item.status} /></td>
                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                      <Link 
                        to={`/staff/verification/${type}/${item.reference || item.referenceNumber}`} 
                        className="soft-btn" 
                        style={{ 
                          padding: '0.5rem 1rem', 
                          fontSize: '0.8rem', 
                          fontWeight: 800, 
                          background: '#ad246d', 
                          color: '#fff', 
                          border: 'none',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '90px',
                          textAlign: 'center'
                        }}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: '#8c7895' }}>
                  <i className='bx bx-file-find' style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.3 }}></i>
                  No items match your search or filter criteria.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};

export default StaffVerificationList;
