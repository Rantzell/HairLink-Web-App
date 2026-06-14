import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import Pagination from '../components/Pagination';
import '../styles/StaffMatchingList.css';

const PAGE_SIZE = 10;

const StaffMatchingList: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await apiClient.get('/internal-api/staff/recipient-matching-list');
        setMatches(res.data.matches || []);
      } catch (err) {
        console.error('Failed to fetch match history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(m =>
    `${m.user?.firstName} ${m.user?.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
    m.reference.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [filter]);
  const totalPages   = Math.ceil(filteredMatches.length / PAGE_SIZE);
  const pagedMatches = filteredMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePrint = () => {
    import('../utils/pdfExport').then(({ exportPDF }) => {
      exportPDF('matchingListPanel', 'Recipient-Matching-List');
    });
  };

  return (
    <section className="section-wrap reveal active staff-page">
      <article className="staff-block matching-list-card" id="matchingListPanel">
        <div className="staff-bar matching-list-header">
          <div className="matching-list-header-left">
            <h2 className="matching-list-title">Recipient Matching List</h2>
          </div>
          <div className="staff-tools matching-list-tools">
            <div className="matching-list-search-wrap">
              <i className='bx bx-search matching-list-search-icon'></i>
              <input 
                type="text" 
                placeholder="Search matching record..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="matching-list-search-input"
              />
            </div>
            <button 
              type="button" 
              className="ghost-btn matching-list-print-btn" 
              onClick={handlePrint}
            >
              <i className='bx bx-printer'></i>
              Print as PDF
            </button>
          </div>
        </div>

        <div className="table-wrap matching-list-table-wrap">
          <table className="staff-table matching-list-table">
            <thead>
              <tr className="matching-list-thead-tr">
                <th className="matching-list-th">Recipient Name</th>
                <th className="matching-list-th">Match Ref</th>
                <th className="matching-list-th">Current Status</th>
                <th className="matching-list-th">Date Matched</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="matching-list-empty">
                    Loading matches...
                  </td>
                </tr>
              ) : filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="matching-list-empty">
                    No matching records found.
                  </td>
                </tr>
              ) : null}
              {!loading && pagedMatches.map((m) => (
                <tr key={m.id} className="matching-list-tr">
                  <td className="matching-list-td-name">{m.user?.firstName} {m.user?.lastName}</td>
                  <td className="matching-list-td-ref">{m.reference}</td>
                  <td className="matching-list-td">
                    <span className="matching-list-status">
                      {m.status}
                    </span>
                  </td>
                  <td className="matching-list-td-date">{new Date(m.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </article>
    </section>
  );
};

export default StaffMatchingList;
