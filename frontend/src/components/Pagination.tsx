import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '1rem 0 0.5rem',
      flexWrap: 'wrap',
    }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '0.35rem 0.85rem',
          borderRadius: '8px',
          border: '1.5px solid #ead7e8',
          background: currentPage === 1 ? '#f9f6fb' : '#fff',
          color: currentPage === 1 ? '#c0b0c8' : '#ad246d',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
      >
        <i className="bx bx-chevron-left"></i> Prev
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ color: '#b0a0b8', fontSize: '0.85rem', padding: '0 2px' }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            style={{
              padding: '0.35rem 0.7rem',
              borderRadius: '8px',
              border: p === currentPage ? 'none' : '1.5px solid #ead7e8',
              background: p === currentPage ? 'linear-gradient(135deg, #ad246d, #cf2f84)' : '#fff',
              color: p === currentPage ? '#fff' : '#665772',
              fontWeight: p === currentPage ? 800 : 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              minWidth: '34px',
              transition: 'all 0.15s ease',
              boxShadow: p === currentPage ? '0 2px 8px rgba(173,36,109,0.25)' : 'none',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '0.35rem 0.85rem',
          borderRadius: '8px',
          border: '1.5px solid #ead7e8',
          background: currentPage === totalPages ? '#f9f6fb' : '#fff',
          color: currentPage === totalPages ? '#c0b0c8' : '#ad246d',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
      >
        Next <i className="bx bx-chevron-right"></i>
      </button>

      <span style={{ fontSize: '0.75rem', color: '#8c7895', marginLeft: '6px' }}>
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
};

export default Pagination;
