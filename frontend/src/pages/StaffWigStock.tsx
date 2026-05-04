import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { WigProduction } from '../types';

const StaffWigStock: React.FC = () => {
  const [wigs, setWigs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('All Colors');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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

  const filteredWigs = (wigs || []).filter(w => {
    const matchesSearch = (w.taskCode || '').toLowerCase().includes(filter.toLowerCase()) ||
                          (w.targetLength || '').toLowerCase().includes(filter.toLowerCase()) ||
                          (w.targetColor || '').toLowerCase().includes(filter.toLowerCase()) ||
                          (w.donation?.reference || '').toLowerCase().includes(filter.toLowerCase());
    
    const matchesColor = colorFilter === 'All Colors' || (w.targetColor || '').toLowerCase().includes(colorFilter.toLowerCase());
    
    return matchesSearch && matchesColor;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Wig Stock</h2>
          <div className="staff-tools" style={{ display: 'flex', gap: '0.6rem', flex: '1', justifyContent: 'flex-end', maxWidth: '700px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
              <i className='bx bx-search' style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#ad246d', fontSize: '0.9rem' }}></i>
              <input 
                type="text" 
                placeholder="Search stock" 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '0 1rem 0 2.2rem', 
                  borderRadius: '8px', 
                  border: '1px solid #ead7e8', 
                  height: '32px',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <button 
              type="button" 
              className="soft-btn" 
              style={{ 
                height: '32px', 
                padding: '0 0.8rem',
                fontWeight: 800, 
                background: '#ad246d', 
                color: '#fff', 
                borderRadius: '8px', 
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                cursor: 'pointer',
                width: 'auto'
              }}
            >
              Search
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                type="button" 
                className="ghost-btn" 
                onClick={() => setShowFilters(!showFilters)}
                style={{ 
                  height: '32px', 
                  minHeight: '32px',
                  maxHeight: '32px',
                  padding: '0 0.8rem',
                  fontWeight: 800, 
                  border: '1px solid #ead7e8', 
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  color: '#5d4d62',
                  background: showFilters ? '#fdf7fb' : '#fff',
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                Filter
              </button>
              
              {showFilters && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '1rem', minWidth: '200px', zIndex: 100 }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.8rem', color: '#ad246d' }}>Filter by Color</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {['All Colors', 'Black', 'Brown', 'Light'].map(c => (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', background: colorFilter === c ? '#fdf7fb' : 'transparent', color: colorFilter === c ? '#ad246d' : '#5d4d62' }}>
                        <input 
                          type="radio" 
                          name="colorFilter" 
                          checked={colorFilter === c}
                          onChange={() => {
                            setColorFilter(c);
                            setShowFilters(false);
                          }}
                          style={{ accentColor: '#ad246d' }}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              type="button" 
              className="ghost-btn" 
              onClick={handlePrint} 
              style={{ 
                height: '32px', 
                minHeight: '32px',
                maxHeight: '32px',
                padding: '0 0.8rem',
                fontWeight: 800, 
                border: '1px solid #ead7e8', 
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: '#5d4d62',
                background: '#fff',
                cursor: 'pointer',
                width: 'auto'
              }}
            >
              Print
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ background: '#fff', borderRadius: '15px', border: '1px solid #f2ebf4', overflow: 'hidden' }}>
          <table className="staff-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fdf7fb' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Stock ID</th>
                <th style={{ width: '70px', textAlign: 'center', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Photo</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Batch Number</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Size</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Color</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date Delivered</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#ad246d', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#8c7895' }}>
                  <i className='bx bx-loader-alt bx-spin' style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}></i>
                  Loading stock...
                </td></tr>
              ) : filteredWigs.length > 0 ? (
                filteredWigs.map(wig => (
                  <tr key={wig.id} style={{ borderTop: '1px solid #f2ebf4' }}>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle' }}><strong style={{ color: '#3b2e43' }}>{wig.taskCode || wig.task_code}</strong></td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0.3rem' }}>
                      <div className="file-thumbnail" style={{ width: '42px', height: '42px', display: 'inline-block', margin: '0 auto', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ead7e8' }}>
                        {wig.photo_url ? (
                          <img src={wig.photo_url} alt="Wig" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#fdf7fb', display: 'grid', placeItems: 'center' }}>
                            <i className='bx bx-image' style={{ color: '#ead7e8' }}></i>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle', color: '#5d4d62' }}>{wig.donation?.reference || 'N/A'}</td>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle', color: '#5d4d62' }}>{wig.targetLength || wig.target_length}</td>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle', color: '#5d4d62' }}>{wig.targetColor || wig.target_color}</td>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle', color: '#5d4d62' }}>{new Date(wig.updatedAt || wig.updated_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1.2rem 1rem', verticalAlign: 'middle' }}><span className="status-chip" style={{ background: '#d4edda', color: '#155724', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Arrived</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: '#8c7895' }}>
                  <i className='bx bx-box' style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.3 }}></i>
                  No wigs currently in stock.
                </td></tr>
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
