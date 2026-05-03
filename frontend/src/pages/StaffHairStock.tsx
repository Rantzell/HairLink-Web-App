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
        setStock(res.data.stock);
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
      <article className="stock-panel" style={{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 8px 30px rgba(173, 36, 109, 0.05)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ad246d', marginBottom: '2rem' }}>Hair Stock Inventory</h2>

        <div className="stock-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          {lengths.map((len) => (
            <section key={len} className="stock-col" style={{ background: '#fdf7fb', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #f2ebf4' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1rem', borderBottom: '1px solid #ead7e8', paddingBottom: '0.5rem' }}>{len}</h3>
              {colors.map((col) => (
                <div key={col} className="stock-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                  <span style={{ fontWeight: 600, color: '#5d4d62' }}>{col}</span>
                  <strong style={{ fontSize: '1.25rem', color: '#ad246d' }}>{loading ? '...' : (stock[len]?.[col] || 0)}</strong>
                </div>
              ))}
            </section>
          ))}
        </div>

        <p className="empty-note" style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#8c7895', fontStyle: 'italic', textAlign: 'center' }}>
          Stock values are digital inventory summaries from approved and categorized hair donations.
        </p>
      </article>
    </section>
  );
};

export default StaffHairStock;
