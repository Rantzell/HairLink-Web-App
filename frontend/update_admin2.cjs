const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

const adminFiles = [
  'AdminCMS.tsx', 'AdminCommunityModeration.tsx', 'AdminDashboard.tsx',
  'AdminEvents.tsx', 'AdminInventory.tsx', 'AdminMatching.tsx',
  'AdminOperations.tsx', 'AdminReports.tsx', 'AdminUserManagement.tsx',
  'AdminVerification.tsx',
];

// ─── Pass 2: More targeted replacements ───
const replacements = [
  // Icon only colors
  [/ style=\{\{ color: '#ad246d' \}\}/g, ' className="admin-icon-pink"'],
  [/ style=\{\{ color: '#ad246d', fontSize: '1\.4rem' \}\}/g, ' className="admin-stat-icon"'],
  [/ style=\{\{ color: '#ad246d', fontSize: '1\.25rem' \}\}/g, ' className="admin-stat-icon"'],
  [/ style=\{\{ color: '#ad246d', fontSize: '1\.2rem' \}\}/g, ' className="admin-icon-pink-lg"'],
  [/ style=\{\{ color: '#ad246d', fontSize: '2rem' \}\}/g, ' className="admin-icon-pink-xl"'],
  [/ style=\{\{ color: '#ad246d', fontSize: '0\.7rem' \}\}/g, ' className="admin-icon-pink-sm"'],
  [/ style=\{\{ fontSize: '2rem', opacity: 0\.3 \}\}/g, ' className="admin-icon-faded"'],

  // Ops/Verification mini stat cards
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', padding: '0\.8rem', borderRadius: '12px', textAlign: 'center' \}\}/g, ' className="admin-mini-stat"'],
  [/ style=\{\{ display: 'block', color: '#8c7895', fontSize: '0\.6rem', textTransform: 'uppercase' \}\}/g, ' className="admin-mini-stat-label"'],
  [/ style=\{\{ fontSize: '1\.2rem', color: '#ad246d' \}\}/g, ' className="admin-mini-stat-value"'],

  // Ops 4-col stat grid
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)', gap: '1rem', marginBottom: '1\.5rem' \}\}/g, ' className="admin-ops-stat-grid"'],

  // Ops card with overflow
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem', overflow: 'hidden' \}\}/g, ' className="admin-ops-card"'],

  // Ops card inner header
  [/ style=\{\{ padding: '0\.5rem 0\.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', alignItems: 'center', gap: '0\.6rem', marginBottom: '0\.5rem' \}\}/g, ' className="admin-ops-card-header"'],
  [/ style=\{\{ background: '#fdf7fb', padding: '0\.4rem', borderRadius: '8px', border: '1px solid #ead7e8', display: 'flex', alignItems: 'center', justifyContent: 'center' \}\}/g, ' className="admin-ops-icon-wrap"'],
  [/ style=\{\{ fontSize: '0\.85rem', fontWeight: 800, margin: 0, color: '#3b2e43' \}\}/g, ' className="admin-ops-card-title"'],

  // Ops/Verification compact table
  [/ style=\{\{ width: '100%', borderCollapse: 'collapse', fontSize: '0\.75rem' \}\}/g, ' className="admin-compact-table"'],
  [/ style=\{\{ background: '#fdf7fb', borderBottom: '1px solid #ead7e8' \}\}/g, ' className="admin-compact-table-head-row"'],
  [/ style=\{\{ textAlign: 'left', padding: '0\.75rem' \}\}/g, ' className="admin-compact-th"'],
  [/ style=\{\{ textAlign: 'left', padding: '0\.6rem' \}\}/g, ' className="admin-compact-th"'],
  [/ style=\{\{ padding: '0\.75rem' \}\}/g, ' className="admin-compact-td"'],
  [/ style=\{\{ padding: '0\.6rem' \}\}/g, ' className="admin-compact-td"'],
  [/ style=\{\{ borderBottom: '1px solid #f2ebf4' \}\}/g, ' className="admin-compact-tr"'],
  [/ style=\{\{ padding: '0\.75rem', color: '#8c7895' \}\}/g, ' className="admin-compact-td admin-td-muted"'],
  [/ style=\{\{ padding: '0\.6rem', color: '#8c7895' \}\}/g, ' className="admin-compact-td admin-td-muted"'],
  [/ style=\{\{ padding: '0\.75rem', color: '#8c7895', fontSize: '0\.7rem' \}\}/g, ' className="admin-compact-td admin-td-note"'],

  // Empty states
  [/ style=\{\{ textAlign: 'center', padding: '3rem', color: '#8c7895' \}\}/g, ' className="admin-empty-state"'],
  [/ style=\{\{ textAlign: 'center', padding: '2rem', color: '#8c7895', fontSize: '0\.8rem' \}\}/g, ' className="admin-compact-table-empty"'],
  [/ style=\{\{ margin: '0\.5rem 0 0', fontSize: '0\.8rem', fontWeight: 800 \}\}/g, ' className="admin-empty-title"'],
  [/ style=\{\{ margin: '0\.1rem 0 0', fontSize: '0\.7rem' \}\}/g, ' className="admin-empty-subtitle"'],

  // Ops status pill (dynamic)
  [/ style=\{\{ \s*padding: '0\.2rem 0\.6rem', borderRadius: '50px', fontSize: '0\.65rem', fontWeight: 800,\s*background: [^}]+\}\}/g, ' className="admin-status-pill"'],

  // Matching table header
  [/ style=\{\{ fontSize: '0\.9rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0\.5rem' \}\}/g, ' className="admin-table-section-title"'],

  // Inventory card with bar
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1rem' \}\}/g, ' className="admin-card-white"'],
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', marginBottom: '0\.75rem', alignItems: 'center' \}\}/g, ' className="admin-bar"'],
  [/ style=\{\{ margin: 0, fontSize: '1rem' \}\}/g, ' className="admin-bar-title"'],
  [/ style=\{\{ padding: '0\.3rem 0\.8rem', borderRadius: '6px', border: '1px solid #ead7e8', fontSize: '0\.8rem' \}\}/g, ' className="admin-filter-input"'],
  [/ style=\{\{ fontSize: '0\.75rem', padding: '0\.6rem' \}\}/g, ' className="admin-compact-th"'],
  [/ style=\{\{ fontSize: '0\.8rem', padding: '0\.6rem' \}\}/g, ' className="admin-compact-td"'],
  [/ style=\{\{ fontSize: '0\.65rem' \}\}/g, ' className="admin-chip-sm"'],

  // Inventory hair stock grid
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(180px, 1fr\)\)', gap: '1rem' \}\}/g, ' className="admin-hair-stock-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(220px, 1fr\)\)', gap: '1rem' \}\}/g, ' className="admin-hair-stock-grid-lg"'],
  [/ style=\{\{ background: '#fdf7fb', padding: '1rem', borderRadius: '12px', border: '1px solid #f2ebf4' \}\}/g, ' className="admin-hair-col"'],
  [/ style=\{\{ margin: '0 0 0\.6rem 0', color: '#ad246d', fontSize: '0\.9rem' \}\}/g, ' className="admin-hair-col-title"'],
  [/ style=\{\{ margin: '0 0 0\.75rem 0', color: '#ad246d' \}\}/g, ' className="admin-hair-col-title-lg"'],
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', padding: '0\.3rem 0', borderBottom: '1px solid #ead7e8', fontSize: '0\.8rem' \}\}/g, ' className="admin-hair-row"'],
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', padding: '0\.5rem 0', borderBottom: '1px solid #ead7e8', fontSize: '0\.85rem' \}\}/g, ' className="admin-hair-row-lg"'],
  [/ style=\{\{ color: '#665772' \}\}/g, ' className="admin-hair-color-label"'],
  [/ style=\{\{ color: '#ad246d' \}\}/g, ' className="admin-val-pink"'],

  // Inventory card with head
  [/ style=\{\{ marginBottom: '1rem' \}\}/g, ' className="admin-card-head-mb"'],
  [/ style=\{\{ margin: 0, fontSize: '1rem' \}\}/g, ' className="admin-bar-title"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.75rem', color: '#8c7895' \}\}/g, ' className="admin-queue-meta"'],
  [/ style=\{\{ borderBottom: '1px solid #ead7e8', paddingBottom: '0\.6rem', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0\.5rem' \}\}/g, ' className="admin-section-underline"'],

  // UserManagement modal
  [/ style=\{\{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba\(0,0,0,0\.5\)', position: 'fixed', inset: 0, zIndex: 1000 \}\}/g, ' className="admin-modal-overlay"'],
  [/ style=\{\{ background: '#fff', padding: '2rem', borderRadius: '20px', width: '450px', maxWidth: '90%' \}\}/g, ' className="admin-modal-box"'],
  [/ style=\{\{ fontSize: '1\.2rem', marginBottom: '1\.5rem', color: '#ad246d' \}\}/g, ' className="admin-modal-title"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0\.75rem' \}\}/g, ' className="admin-form-two-col-sm"'],
  [/ style=\{\{ width: '100%', padding: '0\.5rem', borderRadius: '8px', border: '1px solid #ead7e8' \}\}/g, ' className="admin-select"'],
  [/ style=\{\{ display: 'flex', gap: '0\.75rem', marginTop: '1rem' \}\}/g, ' className="admin-modal-btns"'],
  [/ style=\{\{ \s*flex: 1,\s*padding: '0\.6rem 1rem',\s*borderRadius: '8px',\s*background: '#ad246d',\s*color: '#fff',\s*border: 'none',\s*fontWeight: 800,\s*fontSize: '0\.85rem',\s*cursor: 'pointer',\s*opacity: isSubmitting \? 0\.7 : 1\s*\}\}/g, ' className="admin-modal-btn-primary"'],
  [/ style=\{\{ \s*flex: 1,\s*padding: '0\.6rem 1rem',\s*borderRadius: '8px',\s*background: '#fff',\s*color: '#ad246d',\s*border: '1\.5px solid #ead7e8',\s*fontWeight: 800,\s*fontSize: '0\.85rem',\s*cursor: 'pointer'\s*\}\}/g, ' className="admin-modal-btn-ghost"'],

  // UserManagement user action buttons
  [/ style=\{\{ display: 'flex', gap: '0\.5rem', alignItems: 'center' \}\}/g, ' className="admin-user-actions"'],
  [/ style=\{\{ \s*padding: '0\.35rem 0\.8rem', \s*fontSize: '0\.7rem', \s*background: '#fff', \s*color: '#ad246d', \s*border: '1\.5px solid #ead7e8', \s*borderRadius: '8px', \s*cursor: 'pointer',\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.35rem',\s*fontWeight: 700,\s*transition: 'all 0\.2s'\s*\}\}/g, ' className="admin-user-edit-btn"'],

  // Dashboard specific
  [/ style=\{\{ padding: '1rem' \}\}/g, ' className="admin-page-pad"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)', gap: '1rem', marginBottom: '1rem' \}\}/g, ' className="admin-stat-grid-auto"'],
  [/ style=\{\{ padding: '1rem' \}\}/g, ' className="admin-quick-stat-pad"'],
  [/ style=\{\{ fontSize: '0\.7rem' \}\}/g, ' className="admin-stat-sm-label"'],
  [/ style=\{\{ fontSize: '1\.5rem', margin: '0\.2rem 0' \}\}/g, ' className="admin-stat-number"'],
  [/ style=\{\{ fontSize: '0\.75rem' \}\}/g, ' className="admin-stat-desc"'],

  // Hero section
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '1\.5rem', textAlign: 'center' \}\}/g, ' className="admin-error-card"'],
  [/ style=\{\{ fontSize: '2rem', color: '#ad246d', marginBottom: '1rem', display: 'block' \}\}/g, ' className="admin-error-icon"'],
  [/ style=\{\{ fontSize: '1\.1rem', margin: '0 0 0\.5rem 0' \}\}/g, ' className="admin-error-title"'],
  [/ style=\{\{ color: '#8c7895', fontSize: '0\.85rem', marginBottom: '1rem' \}\}/g, ' className="admin-error-desc"'],
  [/ style=\{\{ background: '#ad246d', color: '#fff', border: 'none', padding: '0\.5rem 1rem', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' \}\}/g, ' className="admin-btn-primary"'],

  // Admin hero
  [/ style=\{\{ color: '#ad246d', fontWeight: 800, fontSize: '0\.7rem', textTransform: 'uppercase', marginBottom: '0\.2rem' \}\}/g, ' className="admin-page-kicker"'],
  [/ style=\{\{ fontSize: '1\.5rem', fontWeight: 900, margin: '0 0 0\.2rem 0' \}\}/g, ' className="admin-hero-title"'],
  [/ style=\{\{ color: '#8c7895', maxWidth: '500px', fontSize: '0\.8rem', margin: 0 \}\}/g, ' className="admin-hero-desc"'],
  [/ style=\{\{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1\.5rem' \}\}/g, ' className="admin-hero-side"'],
  [/ style=\{\{ display: 'inline-flex', alignItems: 'center', gap: '0\.4rem', background: '#fdf2f8', color: '#ad246d', padding: '0\.4rem 0\.8rem', borderRadius: '10px', fontWeight: 800, fontSize: '0\.75rem' \}\}/g, ' className="admin-hero-badge"'],
  [/ style=\{\{ display: 'flex', alignItems: 'center', gap: '1rem' \}\}/g, ' className="admin-hero-summary"'],
  [/ style=\{\{ textAlign: 'left' \}\}/g, ' className="admin-hero-info"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.75rem', color: '#ad246d' \}\}/g, ' className="admin-hero-activity-label"'],
  [/ style=\{\{ fontSize: '0\.8rem', color: '#3b2e43', fontWeight: 700 \}\}/g, ' className="admin-hero-activity-value"'],

  // CMS card style variable usage (style={card})
  // These use a JS variable - we handle them differently below

  // Report specific items
  [/ style=\{\{ \s*padding: '0\.5rem 1\.25rem', \s*borderRadius: '8px', \s*background: '#fdf2f8', \s*color: '#ad246d', \s*border: '1px solid #ead7e8',\s*fontWeight: 800, \s*fontSize: '0\.8rem',\s*textDecoration: 'none',\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.5rem',\s*cursor: 'pointer'\s*\}\}/g, ' className="admin-btn-icon"'],
];

adminFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let fileReplacements = 0;
  replacements.forEach(([pattern, replacement]) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) fileReplacements++;
  });
  
  fs.writeFileSync(filePath, content);
  
  const remaining = (content.match(/style=\{\{/g) || []).length;
  console.log(`${fileName}: ${fileReplacements} replacements, ${remaining} remaining`);
});
