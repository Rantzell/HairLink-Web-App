import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface StockData {
  [length: string]: {
    [color: string]: number;
  };
}

const StaffHairStock: React.FC = () => {
  const [stock, setStock] = useState<StockData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/hair-stock');
        if (res.data.stock) {
          setStock(res.data.stock);
        }
      } catch (err) {
        console.error('Failed to fetch hair stock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const lengths = ['Short', 'Medium', 'Long'];
  const colors = ['Black', 'Brown', 'Light'];

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="stock-panel" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '2rem', boxShadow: '0 10px 40px rgba(173, 36, 109, 0.04)' }}>
        <div className="staff-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <div style={{ flex: '1' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3b2e43', margin: 0 }}>Hair Stock Inventory</h2>
          </div>
          <div className="staff-tools" style={{ display: 'flex', gap: '0.6rem' }}>
            <button 
              type="button" 
              className="ghost-btn" 
              onClick={() => window.print()} 
              style={{ 
                height: '32px', 
                minHeight: '32px',
                maxHeight: '32px',
                padding: '0 1rem',
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

        <div className="stock-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {lengths.map((len) => (
            <section key={len} className="stock-col" style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', border: '1px solid #f2ebf4', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ background: '#fdf7fb', margin: '-1.2rem -1.2rem 1.2rem -1.2rem', padding: '0.8rem 1.2rem', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #f2ebf4' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ad246d', margin: 0, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>{len}</h3>
              </div>
              <div style={{ padding: '0 0.5rem' }}>
                {colors.map((col) => (
                  <div key={col} className="stock-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', borderBottom: col !== 'Light' ? '1px dashed #f2ebf4' : 'none' }}>
                    <span style={{ fontWeight: 700, color: '#5d4d62', fontSize: '0.85rem' }}>{col}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#ad246d', fontWeight: 800 }}>
                        {loading && !stock[len]?.[col] ? '...' : (stock[len]?.[col] || 0)}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: '#8c7895', fontWeight: 600, textTransform: 'uppercase' }}>Items</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div style={{ marginTop: '2.5rem', padding: '1rem', background: '#fdf7fb', borderRadius: '10px', border: '1px solid #f2ebf4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
          <i className='bx bx-info-circle' style={{ color: '#ad246d', fontSize: '1rem' }}></i>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#5d4d62', fontStyle: 'italic', fontWeight: 500 }}>
            Stock values are digital inventory summaries from approved and categorized hair donations.
          </p>
        </div>
      </article>
    </section>
  );
};

export default StaffHairStock;
