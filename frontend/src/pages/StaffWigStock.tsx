import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';
import '../styles/StaffWigStock.css';

const PAGE_SIZE = 10;

const StaffWigStock: React.FC = () => {
  const [wigs, setWigs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('All Colors');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Show only individual finished wigs (WIG-prefixed) — batch parents
  // (WB-prefixed) are tracked elsewhere and shouldn't appear in Wig Stock.
  const onlyWigEntries = (wigs || []).filter(w => {
    const code = (w.taskCode || w.task_code || '').toString().trim().toUpperCase();
    return code.startsWith('WIG');
  });

  const filteredWigs = onlyWigEntries.filter(w => {
    const matchesSearch = (w.taskCode || '').toLowerCase().includes(filter.toLowerCase()) ||
      (w.targetLength || '').toLowerCase().includes(filter.toLowerCase()) ||
      (w.targetColor || '').toLowerCase().includes(filter.toLowerCase()) ||
      (w.donation?.reference || '').toLowerCase().includes(filter.toLowerCase());

    const matchesColor = colorFilter === 'All Colors' || (w.targetColor || '').toLowerCase().includes(colorFilter.toLowerCase());

    return matchesSearch && matchesColor;
  });

  useEffect(() => { setCurrentPage(1); }, [filter, colorFilter]);
  const totalPages = Math.ceil(filteredWigs.length / PAGE_SIZE);
  const pagedWigs = filteredWigs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="staff-block">
        <div className="staff-bar staff-wig-bar">
          <h2 className="staff-wig-title">Wig Stock Inventory</h2>
          <div className="staff-tools staff-wig-tools">
            <div className="staff-wig-search-wrapper">
              <i className="bx bx-search staff-wig-search-icon"></i>
              <input
                type="text"
                placeholder="Search stock"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="staff-wig-search-input"
              />
            </div>
            <button
              type="button"
              className="soft-btn staff-wig-search-btn"
            >
              Search
            </button>
            <div className="staff-wig-filter-wrapper">
              <button
                type="button"
                className={`ghost-btn staff-wig-filter-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filter
              </button>

              {showFilters && (
                <div className="staff-wig-filter-dropdown">
                  <h4 className="staff-wig-filter-dropdown-title">Filter by Color</h4>
                  <div className="staff-wig-filter-options">
                    {['All Colors', 'Black', 'Brown', 'Light'].map(c => (
                      <label key={c} className={`staff-wig-filter-option ${colorFilter === c ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="colorFilter"
                          checked={colorFilter === c}
                          onChange={() => {
                            setColorFilter(c);
                            setShowFilters(false);
                          }}
                          className="staff-wig-filter-radio"
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
              className="staff-wig-print-btn"
              onClick={handlePrint}
            >
              <i className='bx bx-printer'></i> Print as PDF
            </button>
          </div>
        </div>

        <div className="table-wrap staff-wig-table-wrap">
          <table className="staff-table staff-wig-table">
            <thead className="staff-wig-thead">
              <tr>
                <th className="staff-wig-th">Stock ID</th>
                <th className="staff-wig-th-photo">Photo</th>
                <th className="staff-wig-th">Size</th>
                <th className="staff-wig-th">Color</th>
                <th className="staff-wig-th">Date Delivered</th>
                <th className="staff-wig-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="staff-wig-loading">
                    <i className="bx bx-loader-alt bx-spin staff-wig-loading-icon"></i>
                    Loading stock...
                  </td>
                </tr>
              ) : pagedWigs.length > 0 ? (
                pagedWigs.map(wig => (
                  <tr key={wig.id} className="staff-wig-tr-body">
                    <td className="staff-wig-td stock-id">{wig.taskCode || wig.task_code}</td>
                    <td className="staff-wig-td-center">
                      <div className="staff-wig-thumbnail-box">
                        {wig.photo_url ? (
                          <img src={wig.photo_url} alt="Wig" className="staff-wig-thumbnail-img" />
                        ) : (
                          <div className="staff-wig-thumbnail-placeholder">
                            <i className="bx bx-image staff-wig-thumbnail-placeholder-icon"></i>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="staff-wig-td">{wig.targetLength || wig.target_length}</td>
                    <td className="staff-wig-td">{wig.targetColor || wig.target_color}</td>
                    <td className="staff-wig-td">{new Date(wig.updatedAt || wig.updated_at).toLocaleDateString()}</td>
                    <td className="staff-wig-td">
                      <span className="staff-wig-status-pill">Arrived</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="staff-wig-empty">
                    <i className="bx bx-box staff-wig-empty-icon"></i>
                    No wigs currently in stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </article>

      <style dangerouslySetInnerHTML={{
        __html: `
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
