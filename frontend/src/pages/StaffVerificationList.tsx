import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import '../styles/StaffVerificationList.css';

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
  const hasActions = type !== 'monetary';

  return (
    <div className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar staff-bar-flex">
          <h2 className="staff-queue-title">{title}{hasActions ? ' Verification Queue' : ''}</h2>
          <div className="staff-tools staff-tools-flex">
            <div className="search-input-wrapper">
              <i className='bx bx-search search-input-icon'></i>
              <input 
                type="text" 
                placeholder="Search recipient or reference" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-field"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter-select"
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <div className="tracking-table-wrap tracking-table-container">
          <table className="tracking-table tracking-table-styled">
            <thead className="tracking-table-head">
              <tr>
                <th className="tracking-table-th">Reference</th>
                <th className="tracking-table-th">Date</th>
                <th className="tracking-table-th">User</th>
                <th className="tracking-table-th">Status</th>
                {hasActions && <th className="tracking-table-th-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={hasActions ? 5 : 4} className="tracking-table-loading">
                  <i className='bx bx-loader-alt bx-spin tracking-table-loading-icon'></i>
                  Loading verification queue...
                </td></tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <tr key={item.id} className="tracking-table-row">
                    <td className="tracking-table-td"><strong className="tracking-table-td-bold">{item.reference || item.referenceNumber}</strong></td>
                    <td className="tracking-table-td-date">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="tracking-table-td-user">{item.user ? `${item.user.firstName} ${item.user.lastName}` : (item.name || 'Anonymous')}</td>
                    <td className="tracking-table-td"><StatusPill status={item.status} /></td>
                    {hasActions && (
                      <td className="tracking-table-td-center">
                        <Link 
                          to={`/staff/verification/${type}/${item.reference || item.referenceNumber}`} 
                          className="soft-btn review-btn-styled"
                        >
                          Review
                        </Link>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={hasActions ? 5 : 4} className="tracking-table-empty">
                  <i className='bx bx-file-find tracking-table-empty-icon'></i>
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
