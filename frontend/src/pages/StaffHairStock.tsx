import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import '../styles/StaffHairStock.css';

interface StockData {
  [length: string]: {
    [color: string]: number;
  };
}

const StaffHairStock: React.FC = () => {
  const [stock, setStock] = useState<StockData>({});
  const [uncategorized, setUncategorized] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/hair-stock');
        if (res.data.stock) {
          setStock(res.data.stock);
        }
        if (res.data.uncategorized !== undefined) {
          setUncategorized(res.data.uncategorized);
        }
      } catch (err) {
        console.error('Failed to fetch hair stock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const lengths = ['Short', 'Long'];
  const colors = ['Black', 'Brown', 'Light'];

  // Compute total across all categories
  const grandTotal = Object.values(stock).reduce((sum, colorMap) =>
    sum + Object.values(colorMap).reduce((s, v) => s + v, 0), 0
  ) + uncategorized;

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="stock-panel hair-stock-panel" id="hairStockPanel">
        <div className="staff-bar hair-stock-bar">
          <div className="hair-stock-bar-left">
            <h2 className="hair-stock-title">Hair Stock Inventory</h2>
            {!loading && <span className="sd-stat-sub" style={{marginTop:'0.25rem'}}>Total: <strong>{grandTotal}</strong> stock unit{grandTotal !== 1 ? 's' : ''}</span>}
          </div>
          <div className="staff-tools hair-stock-tools">
            <button 
              type="button" 
              className="hair-stock-print-btn" 
              onClick={() => {
                import('../utils/pdfExport').then(({ exportPDF }) => {
                  exportPDF('hairStockPanel', 'Hair-Stock-Inventory');
                });
              }}
            >
              <i className='bx bx-printer'></i>
              Print as PDF
            </button>
          </div>
        </div>

        <div className="stock-columns hair-stock-grid">
          {lengths.map((len) => (
            <section key={len} className="stock-col hair-stock-col">
              <div className="hair-stock-col-header">
                <h3 className="hair-stock-col-title">{len}</h3>
              </div>
              <div className="hair-stock-col-body">
                {colors.map((col) => {
                  const count = stock[len]?.[col] || 0;
                  return (
                    <div key={col} className="stock-row hair-stock-row">
                      <span className="hair-stock-color-label">{col}</span>
                      <div className="hair-stock-value-group">
                        <strong className="hair-stock-count">
                          {loading ? '...' : count}
                        </strong>
                        <span className="hair-stock-unit">Items</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="hair-stock-footer">
          <i className="bx bx-info-circle hair-stock-footer-icon"></i>
          <p className="hair-stock-footer-text">
            Stock values are digital inventory summaries from approved and categorized hair donations.
            {uncategorized > 0 && (
              <> &nbsp;<strong>{uncategorized}</strong> donation{uncategorized !== 1 ? 's' : ''} could not be categorized (missing length/color data).</>
            )}
          </p>
        </div>
      </article>
    </section>
  );
};

export default StaffHairStock;
