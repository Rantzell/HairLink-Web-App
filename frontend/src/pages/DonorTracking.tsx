import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusPill from '../components/StatusPill';
import Pagination from '../components/Pagination';
import type { Donation } from '../types';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const PAGE_SIZE = 10;

const DonorTracking: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDonations = useCallback(async () => {
    try {
      const res = await apiClient.get('/internal-api/donations');
      setDonations(res.data);
    } catch (err) {
      console.error('Failed to fetch donations', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(fetchDonations, 15_000);

  const filteredDonations = donations.filter(d =>
    d.reference.toLowerCase().includes(filter.toLowerCase()) ||
    d.status.toLowerCase().includes(filter.toLowerCase()) ||
    d.hairLength.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [filter]);
  const totalPages    = Math.ceil(filteredDonations.length / PAGE_SIZE);
  const pagedDonations = filteredDonations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="section-wrap donor-module-page reveal active">
      <header className="module-head" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#261d2b', margin: 0 }}>My Donation Tracking</h1>
        <p style={{ color: '#665772', fontSize: '0.75rem', marginTop: '0.2rem' }}>Monitor status changes from submission to completion and certificate release.</p>
        <div className="tracking-tools" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <i className="bx bx-search" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '1rem' }}></i>
            <input 
              type="text" 
              placeholder="Search reference, status..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '0.4rem 0.8rem 0.4rem 2.2rem', borderRadius: '8px', border: '1px solid #ead7e8', fontSize: '0.8rem', width: '250px', outline: 'none' }}
            />
          </div>
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
              ) : pagedDonations.length > 0 ? (
                pagedDonations.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontSize: '0.85rem' }}><strong>{d.reference}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td style={{ fontSize: '0.85rem' }}>{d.hairLength}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {['Received Hair', 'In Queue', 'In Progress', 'Completed', 'Wig Received'].includes(d.status) ? (
                        <Link to={`/donor/certificate?ref=${d.reference}`} style={{ color: '#ad246d', fontWeight: 700, textDecoration: 'none' }}>View Certificate</Link>
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
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </article>
    </section>
  );
};

export default DonorTracking;
