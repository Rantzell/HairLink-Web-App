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
      <header className="module-head" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>My Donation Tracking</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.2rem' }}>Monitor status changes from submission to completion and certificate release.</p>
        <div className="tracking-tools" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search reference, status..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #ead7e8', fontSize: '0.8rem', width: '250px' }}
          />
          <Link 
            to="/donor/donate" 
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
            Submit Another Donation
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
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Hair Length</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase' }}>Certificate</th>
                <th style={{ fontSize: '0.75rem', color: '#ad246d', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading donations...</td></tr>
              ) : filteredDonations.length > 0 ? (
                filteredDonations.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontSize: '0.85rem' }}><strong>{d.reference}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td style={{ fontSize: '0.85rem' }}>{d.hairLength}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(d.status) ? (
                        <Link to="/donor/certificate" style={{ color: '#ad246d', fontWeight: 700, textDecoration: 'none' }}>View Certificate</Link>
                      ) : (
                        <span style={{ color: '#ada9b0' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link 
                        to={`/donor/tracking/${d.reference}`} 
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
