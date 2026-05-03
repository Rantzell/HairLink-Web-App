import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import type { Donation } from '../types';

const DonorTracking: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await apiClient.get('/internal-api/donations');
        setDonations(res.data);
      } catch (err) {
        console.error('Failed to fetch donations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

  const filteredDonations = donations.filter(d => 
    d.reference.toLowerCase().includes(filter.toLowerCase()) ||
    d.status.toLowerCase().includes(filter.toLowerCase()) ||
    d.hairLength.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head">
        <h1>My Donation Tracking</h1>
        <p>Monitor status changes from submission to completion and certificate release.</p>
        <div className="tracking-tools">
          <input 
            type="text" 
            placeholder="Search by reference, status, hair details..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <Link className="soft-btn" to="/donor/donate">Submit Another Donation</Link>
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
                <th>Hair Length</th>
                <th>Certificate</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading donations...</td></tr>
              ) : filteredDonations.length > 0 ? (
                filteredDonations.map(d => (
                  <tr key={d.id}>
                    <td><strong>{d.reference}</strong></td>
                    <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td>{d.hairLength}</td>
                    <td>
                      {['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(d.status) ? (
                        <Link to="/donor/certificate" className="link-text">View Certificate</Link>
                      ) : (
                        <span style={{ color: '#ada9b0' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/donor/tracking/${d.reference}`} className="ghost-btn">Details</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#7a687f' }}>
                    {filter ? 'No matching donations found.' : 'No donation records yet. Submit your first hair donation to begin tracking.'}
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

export default DonorTracking;
