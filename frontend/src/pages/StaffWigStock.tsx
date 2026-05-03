import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { WigProduction } from '../types';

const StaffWigStock: React.FC = () => {
  const [wigs, setWigs] = useState<WigProduction[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/wig-stock');
        setWigs(res.data);
      } catch (err) {
        console.error('Failed to fetch wig stock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const filteredWigs = wigs.filter(w => 
    w.taskCode.toLowerCase().includes(filter.toLowerCase()) ||
    w.targetLength.toLowerCase().includes(filter.toLowerCase()) ||
    w.targetColor.toLowerCase().includes(filter.toLowerCase()) ||
    (w.donation?.reference || '').toLowerCase().includes(filter.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #ad246d', paddingBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Wig Stock</h2>
          <div className="staff-tools" style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Search stock..." 
              className="search-input" 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #ead7e8' }}
            />
            <button type="button" className="ghost-btn" onClick={handlePrint}>Print</button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Stock ID</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Photo</th>
                <th>Batch Reference</th>
                <th>Size</th>
                <th>Color</th>
                <th>Date Added</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading stock...</td></tr>
              ) : filteredWigs.length > 0 ? (
                filteredWigs.map(wig => (
                  <tr key={wig.id}>
                    <td><strong>{wig.taskCode}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      {/* Placeholder for photo if any */}
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fdf7fb', margin: '0 auto', display: 'grid', placeItems: 'center' }}>
                        <i className='bx bx-image' style={{ color: '#ead7e8' }}></i>
                      </div>
                    </td>
                    <td>{wig.donation?.reference || 'N/A'}</td>
                    <td>{wig.targetLength}</td>
                    <td>{wig.targetColor}</td>
                    <td>{new Date(wig.updatedAt).toLocaleDateString()}</td>
                    <td><span className="status-chip" style={{ background: '#d4edda', color: '#155724', border: 'none' }}>Arrived</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No wigs found in stock.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .staff-tools, .dash-header, .dash-nav { display: none !important; }
          .dash-main { padding: 0 !important; margin: 0 !important; }
          .section-wrap { padding: 0 !important; }
          .staff-block { border: none !important; box-shadow: none !important; }
          .staff-table th, .staff-table td { border: 1px solid #eee !important; }
        }
      `}} />
    </section>
  );
};

export default StaffWigStock;
