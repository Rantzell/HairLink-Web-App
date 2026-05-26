const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

// Map of inline style patterns to class replacements.
// These are applied as string replacements across all admin files.
const replacements = [
  // ── Page headers ──
  [/ style=\{\{ padding: '0\.6rem 0 0\.2rem' \}\}/g, ' className="admin-page-header"'],
  [/ style=\{\{ padding: '0\.6rem 0 0\.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' \}\}/g, ' className="admin-header-row admin-page-header"'],

  // ── Kicker/title/subtitle ──
  [/ style=\{\{ fontSize: '0\.72rem', fontWeight: 800, letterSpacing: '0\.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0\.2rem' \}\}/g, ' className="admin-page-kicker"'],
  [/ style=\{\{ fontSize: '0\.65rem', fontWeight: 800, letterSpacing: '0\.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0\.1rem' \}\}/g, ' className="admin-page-kicker"'],
  [/ style=\{\{ fontSize: '0\.65rem', fontWeight: 800, letterSpacing: '0\.08em', textTransform: 'uppercase', color: '#ad246d', marginBottom: '0\.2rem' \}\}/g, ' className="admin-page-kicker"'],
  [/ style=\{\{ fontSize: '1\.2rem', fontWeight: 800, color: '#261d2b', margin: 0 \}\}/g, ' className="admin-page-title"'],
  [/ style=\{\{ fontSize: '2\.1rem', color: '#261d2b', margin: 0 \}\}/g, ' className="admin-page-title-lg"'],
  [/ style=\{\{ color: '#665772', fontSize: '0\.75rem', marginTop: '0\.1rem' \}\}/g, ' className="admin-page-subtitle"'],
  [/ style=\{\{ color: '#665772', fontSize: '0\.88rem', marginTop: '0\.25rem' \}\}/g, ' className="admin-page-subtitle-lg"'],
  [/ style=\{\{ color: '#665772', fontSize: '0\.75rem', margin: 0 \}\}/g, ' className="admin-page-subtitle"'],

  // ── Header rows ──
  [/ style=\{\{ marginBottom: '1\.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' \}\}/g, ' className="admin-header-row-end"'],
  [/ style=\{\{ padding: '0\.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' \}\}/g, ' className="admin-report-header-row"'],
  [/ style=\{\{ display: 'flex', gap: '0\.75rem' \}\}/g, ' className="admin-btn-actions"'],

  // ── Summary grid ──
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(150px, 1fr\)\)', gap: '1rem', margin: '1\.5rem 0' \}\}/g, ' className="admin-summary-grid"'],

  // ── Summary item ──
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1\.25rem', textAlign: 'center' \}\}/g, ' className="admin-summary-item"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.8rem', color: '#8c7895', fontWeight: 700 \}\}/g, ' className="admin-summary-label"'],
  [/ style=\{\{ fontSize: '1\.75rem', color: '#ad246d' \}\}/g, ' className="admin-summary-value"'],

  // ── Stat cards ──
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' \}\}/g, ' className="admin-stat-card"'],
  [/ style=\{\{ background: '#fdf7fb', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' \}\}/g, ' className="admin-stat-icon-wrap"'],
  [/ style=\{\{ display: 'block', color: '#8c7895', fontSize: '0\.65rem', fontWeight: 700 \}\}/g, ' className="admin-stat-label"'],
  [/ style=\{\{ fontSize: '1\.2rem', color: '#261d2b' \}\}/g, ' className="admin-stat-value"'],

  // ── Cards ──
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '1\.25rem' \}\}/g, ' className="admin-card-white"'],
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1\.5rem', marginBottom: '2rem' \}\}/g, ' className="admin-card-rounded-mb"'],
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '24px', padding: '1\.5rem' \}\}/g, ' className="admin-card-rounded"'],
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '20px', padding: '1\.25rem' \}\}/g, ' className="admin-card-module"'],
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '1rem' \}\}/g, ' className="admin-focus-card"'],

  // ── Card headings ──
  [/ style=\{\{ margin: '0 0 1\.5rem 0' \}\}/g, ' className="admin-card-title"'],
  [/ style=\{\{ fontSize: '1\.05rem', fontWeight: 800, margin: '0 0 1\.2rem 0', color: '#261d2b' \}\}/g, ' className="admin-card-title-sm"'],
  [/ style=\{\{ fontSize: '0\.95rem', fontWeight: 800, margin: '0 0 1\.2rem 0', color: '#261d2b' \}\}/g, ' className="admin-card-title-xs"'],
  [/ style=\{\{ fontSize: '1rem', marginBottom: '1rem' \}\}/g, ' className="admin-card-subtitle"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.65rem', fontWeight: 800, color: '#ad246d' \}\}/g, ' className="admin-section-kicker"'],
  [/ style=\{\{ margin: 0, fontSize: '1\.1rem' \}\}/g, ' className="admin-section-title"'],
  [/ style=\{\{ marginBottom: '1\.25rem' \}\}/g, ' className="admin-section-head-mb"'],

  // ── Toolbar surface ──
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '15px', padding: '0\.8rem 1\.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' \}\}/g, ' className="admin-toolbar-surface"'],
  [/ style=\{\{ fontSize: '1rem', margin: 0 \}\}/g, ' className="admin-toolbar-title"'],
  [/ style=\{\{ display: 'flex', gap: '0\.6rem' \}\}/g, ' className="admin-quick-links"'],

  // ── Quick links ──
  [/ style=\{\{ \s*padding: '0\.4rem 0\.8rem', \s*fontSize: '0\.75rem', \s*textDecoration: 'none', \s*color: '#ad246d', \s*border: '1px solid #ead7e8', \s*borderRadius: '8px', \s*background: '#fff',\s*fontWeight: 800,\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.3rem'\s*\}\}/g, ' className="admin-quick-link-btn"'],

  // ── Grids ──
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' \}\}/g, ' className="admin-priority-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1\.5rem' \}\}/g, ' className="admin-two-col-grid-lg"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' \}\}/g, ' className="admin-two-col-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' \}\}/g, ' className="admin-two-col-grid-2rem"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(3, 1fr\)', gap: '1rem', marginBottom: '1\.5rem' \}\}/g, ' className="admin-three-col-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)', gap: '1rem', textAlign: 'center' \}\}/g, ' className="admin-four-col-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(220px, 1fr\)\)', gap: '0\.75rem' \}\}/g, ' className="admin-auto-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' \}\}/g, ' className="admin-sidebar-layout"'],

  // ── Focus cards ──
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' \}\}/g, ' className="admin-focus-head"'],
  [/ style=\{\{ color: '#ad246d', fontWeight: 800, fontSize: '0\.75rem' \}\}/g, ' className="admin-focus-link"'],
  [/ style=\{\{ padding: '0\.75rem', borderBottom: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}/g, ' className="admin-queue-item"'],
  [/ style=\{\{ fontSize: '0\.85rem' \}\}/g, ' className="admin-td-text"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.75rem', color: '#8c7895' \}\}/g, ' className="admin-queue-meta"'],

  // ── Action links ──
  [/ style=\{\{ display: 'flex', gap: '0\.75rem', padding: '0\.8rem', borderRadius: '12px', border: '1px solid #f2ebf4', background: '#fdf7fb' \}\}/g, ' className="admin-action-link-card"'],
  [/ style=\{\{ fontSize: '1\.5rem', color: '#ad246d' \}\}/g, ' className="admin-action-link-icon"'],
  [/ style=\{\{ margin: '0 0 0\.1rem 0', fontSize: '0\.9rem' \}\}/g, ' className="admin-action-link-title"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.7rem', color: '#8c7895' \}\}/g, ' className="admin-action-link-desc"'],

  // ── Buttons ──
  [/ style=\{\{ \s*padding: '0\.5rem 1\.25rem', \s*borderRadius: '8px', \s*background: '#ad246d', \s*color: '#fff', \s*border: 'none', \s*fontWeight: 800, \s*fontSize: '0\.8rem', \s*cursor: 'pointer', \s*opacity: isSubmitting \? 0\.7 : 1, \s*width: '100%', \s*marginTop: '0\.5rem'\s*\}\}/g, ' className="admin-btn-primary-full"'],
  [/ style=\{\{ \s*padding: '0\.5rem 1\.25rem', \s*borderRadius: '8px', \s*background: '#ad246d', \s*color: '#fff', \s*border: 'none', \s*fontWeight: 800, \s*fontSize: '0\.8rem',\s*cursor: 'pointer',\s*opacity: isSubmitting \? 0\.7 : 1\s*\}\}/g, ' className="admin-btn-primary"'],
  [/ style=\{\{ \s*padding: '0\.5rem 1\.25rem',\s*borderRadius: '8px',\s*background: '#fff',\s*color: '#ad246d',\s*border: '1\.5px solid #ead7e8',\s*fontWeight: 800,\s*fontSize: '0\.8rem',\s*cursor: 'pointer'\s*\}\}/g, ' className="admin-btn-ghost"'],
  [/ style=\{\{ \s*padding: '0\.5rem 1\.25rem', \s*borderRadius: '8px', \s*background: '#ad246d', \s*color: '#fff', \s*border: 'none', \s*fontWeight: 800, \s*fontSize: '0\.8rem',\s*cursor: 'pointer',\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.5rem'\s*\}\}/g, ' className="admin-btn-print"'],
  [/ style=\{\{ display: 'flex', gap: '0\.75rem', marginTop: '0\.5rem' \}\}/g, ' className="admin-btn-row"'],

  // ── Form labels ──
  [/ style=\{\{ display: 'block', fontWeight: 700, fontSize: '0\.75rem', marginBottom: '0\.3rem', color: '#665772' \}\}/g, ' className="admin-form-label"'],
  [/ style=\{\{ fontSize: '0\.7rem', fontWeight: 700 \}\}/g, ' className="admin-form-label-sm"'],
  [/ style=\{\{ display: 'grid', gap: '1rem' \}\}/g, ' className="admin-form-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' \}\}/g, ' className="admin-form-two-col"'],
  [/ style=\{\{ display: 'grid', gap: '0\.75rem' \}\}/g, ' className="admin-form-grid"'],

  // ── Event items ──
  [/ style=\{\{ display: 'grid', gap: '1rem' \}\}/g, ' className="admin-event-list"'],
  [/ style=\{\{ display: 'flex', gap: '1rem', padding: '1rem', background: '#fdf7fb', borderRadius: '12px' \}\}/g, ' className="admin-event-item"'],
  [/ style=\{\{ textAlign: 'center', background: '#ad246d', color: '#fff', padding: '0\.5rem', borderRadius: '8px', minWidth: '50px' \}\}/g, ' className="admin-event-date-badge"'],
  [/ style=\{\{ fontSize: '1\.2rem', fontWeight: 900 \}\}/g, ' className="admin-event-date-day"'],
  [/ style=\{\{ fontSize: '0\.7rem', textTransform: 'uppercase' \}\}/g, ' className="admin-event-date-month"'],
  [/ style=\{\{ margin: '0 0 0\.25rem 0' \}\}/g, ' className="admin-event-title"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.85rem', color: '#8c7895' \}\}/g, ' className="admin-event-meta"'],
  [/ style=\{\{ textAlign: 'center', color: '#8c7895' \}\}/g, ' className="admin-event-empty"'],
  [/ style=\{\{ background: '#ad246d', color: '#fff', padding: '0\.5rem', borderRadius: '8px', display: 'grid', placeItems: 'center' \}\}/g, ' className="admin-pin-icon"'],

  // ── Live badge ──
  [/ style=\{\{ background: '#fdf7fb', padding: '0\.35rem 0\.9rem', borderRadius: '50px', border: '1px solid #ead7e8', display: 'flex', alignItems: 'center', gap: '0\.4rem' \}\}/g, ' className="admin-live-badge"'],
  [/ style=\{\{ width: '6px', height: '6px', background: '#ad246d', borderRadius: '50%' \}\}/g, ' className="admin-live-dot"'],
  [/ style=\{\{ fontSize: '0\.7rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase' \}\}/g, ' className="admin-live-text"'],

  // ── Matching page ──
  [/ style=\{\{ background: '#fdf7fb', padding: '0\.8rem', borderRadius: '12px', border: '1px solid #f2ebf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}/g, ' className="admin-match-opportunity"'],
  [/ style=\{\{ fontSize: '0\.8rem', display: 'block' \}\}/g, ' className="admin-match-name"'],
  [/ style=\{\{ color: '#8c7895' \}\}/g, ' className="admin-match-meta"'],
  [/ style=\{\{ textAlign: 'right' \}\}/g, ' className="admin-match-score-wrap"'],
  [/ style=\{\{ fontSize: '1rem', fontWeight: 900, color: '#28a745' \}\}/g, ' className="admin-match-score"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.6rem', color: '#8c7895', fontWeight: 800 \}\}/g, ' className="admin-match-score-label"'],
  [/ style=\{\{ textAlign: 'center', padding: '2rem', color: '#8c7895', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ead7e8' \}\}/g, ' className="admin-match-empty"'],
  [/ style=\{\{ margin: 0, fontSize: '0\.8rem' \}\}/g, ' className="admin-match-empty-p"'],
  [/ style=\{\{ display: 'grid', gap: '0\.75rem' \}\}/g, ' className="admin-match-opportunity-grid"'],

  // ── td ellipsis ──
  [/ style=\{\{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}/g, ' className="admin-td-ellipsis"'],

  // ── delete btn ──
  [/ style=\{\{ color: '#ad246d', fontSize: '0\.75rem' \}\}/g, ' className="admin-delete-btn"'],

  // ── report rows ──
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', padding: '0\.3rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0\.75rem' \}\}/g, ' className="admin-report-row"'],
  [/ style=\{\{ margin: 0, fontWeight: 800, fontSize: '0\.75rem' \}\}/g, ' className="admin-report-id"'],
  [/ style=\{\{ margin: 0, color: '#8c7895', fontSize: '0\.7rem' \}\}/g, ' className="admin-report-timestamp"'],
];

const adminFiles = [
  'AdminCMS.tsx',
  'AdminCommunityModeration.tsx',
  'AdminDashboard.tsx',
  'AdminEvents.tsx',
  'AdminInventory.tsx',
  'AdminMatching.tsx',
  'AdminOperations.tsx',
  'AdminReports.tsx',
  'AdminUserManagement.tsx',
  'AdminVerification.tsx',
];

let totalReplacements = 0;

adminFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add CSS import if not already present
  if (!content.includes("import '../styles/Admin.css'")) {
    content = content.replace(
      /^(import React.*?;)/m,
      `$1\nimport '../styles/Admin.css';`
    );
  }
  
  let fileReplacements = 0;
  replacements.forEach(([pattern, replacement]) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) fileReplacements++;
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`${fileName}: applied ${fileReplacements} pattern replacements`);
  totalReplacements += fileReplacements;
});

console.log(`\nTotal pattern replacements across all files: ${totalReplacements}`);

// Count remaining inline styles
console.log('\nRemaining inline styles per file:');
adminFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/style=\{\{/g) || [];
  if (matches.length > 0) {
    console.log(`  ${fileName}: ${matches.length} remaining`);
  } else {
    console.log(`  ${fileName}: ✓ clean`);
  }
});
