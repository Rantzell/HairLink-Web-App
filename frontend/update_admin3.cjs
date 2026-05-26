const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

// Third-pass: targeted per-file replacements for stubborn patterns
const reports = fs.readFileSync(path.join(pagesDir, 'AdminReports.tsx'), 'utf8');
const cms = fs.readFileSync(path.join(pagesDir, 'AdminCMS.tsx'), 'utf8');
const dashboard = fs.readFileSync(path.join(pagesDir, 'AdminDashboard.tsx'), 'utf8');
const events = fs.readFileSync(path.join(pagesDir, 'AdminEvents.tsx'), 'utf8');
const inventory = fs.readFileSync(path.join(pagesDir, 'AdminInventory.tsx'), 'utf8');
const userMgmt = fs.readFileSync(path.join(pagesDir, 'AdminUserManagement.tsx'), 'utf8');

// ── AdminReports: report doc + header styles ──
const reportFixes = [
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '16px', padding: '2rem' \}\}/g, ' className="admin-report-doc"'],
  [/ style=\{\{ borderBottom: '2px solid #ad246d', paddingBottom: '1rem', marginBottom: '1\.5rem', display: 'flex', justifyContent: 'space-between' \}\}/g, ' className="admin-report-doc-header"'],
  [/ style=\{\{ color: '#ad246d', margin: 0, fontSize: '1\.5rem', fontWeight: 900 \}\}/g, ' className="admin-report-doc-title"'],
  [/ style=\{\{ color: '#ad246d', margin: 0, fontSize: '1\.6rem', fontWeight: 900 \}\}/g, ' className="admin-report-doc-title"'],
  [/ style=\{\{ margin: '0\.2rem 0', color: '#8c7895', fontSize: '0\.8rem' \}\}/g, ' className="admin-report-doc-subtitle"'],
  [/ style=\{\{ margin: 0, fontWeight: 800, fontSize: '0\.7rem' \}\}/g, ' className="admin-report-id"'],
  [/ style=\{\{ margin: 0, color: '#8c7895', fontSize: '0\.65rem' \}\}/g, ' className="admin-report-timestamp"'],
  [/ style=\{\{ marginBottom: '2rem' \}\}/g, ' className="admin-report-section"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(2, 1fr\)', gap: '1\.5rem' \}\}/g, ' className="admin-report-two-col"'],
  [/ style=\{\{ background: '#fdf7fb', padding: '1\.25rem', borderRadius: '12px', border: '1px solid #ead7e8', textAlign: 'center' \}\}/g, ' className="admin-report-kpi-card"'],
  [/ style=\{\{ color: '#8c7895', display: 'block', fontSize: '0\.65rem' \}\}/g, ' className="admin-report-kpi-label"'],
  [/ style=\{\{ fontSize: '1\.8rem', color: '#ad246d' \}\}/g, ' className="admin-report-kpi-value"'],
  [/ style=\{\{ fontSize: '0\.85rem', color: '#ad246d', textTransform: 'uppercase', marginBottom: '0\.8rem', borderBottom: '1px solid #f2ebf4' \}\}/g, ' className="admin-report-section-title"'],
  [/ style=\{\{ width: '100%', borderCollapse: 'collapse', fontSize: '0\.7rem' \}\}/g, ' className="admin-report-table"'],
  [/ style=\{\{ background: '#fdf7fb' \}\}/g, ' className="admin-compact-table-head-row"'],
  [/ style=\{\{ textAlign: 'left', padding: '0\.5rem', borderBottom: '1px solid #ead7e8' \}\}/g, ' className="admin-report-th"'],
  [/ style=\{\{ padding: '0\.5rem', borderBottom: '1px solid #f2ebf4' \}\}/g, ' className="admin-report-td"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)', gap: '1rem', textAlign: 'center' \}\}/g, ' className="admin-four-col-grid"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' \}\}/g, ' className="admin-two-col-grid-2rem"'],
];

let r = reports;
reportFixes.forEach(([pat, rep]) => { r = r.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminReports.tsx'), r);
const rLeft = (r.match(/style=\{\{/g)||[]).length;
console.log(`AdminReports: ${rLeft} remaining`);

// ── AdminCMS ──
const cmsFixes = [
  [/ style=\{\{ marginBottom: '0\.75rem' \}\}/g, ' className="admin-cms-field"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '4px' \}\}/g, ' className="admin-cms-field-label"'],
  [/ style=\{\{ width: '100%', padding: '0\.6rem 0\.8rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0\.82rem', outline: 'none', resize: 'vertical', background: '#fdf7fb' \}\}/g, ' className="admin-cms-textarea"'],
  [/ style=\{\{ width: '100%', padding: '0\.6rem 0\.8rem', borderRadius: '10px', border: '1px solid #ead7e8', fontSize: '0\.82rem', outline: 'none', background: '#fdf7fb' \}\}/g, ' className="admin-cms-input"'],
  [/ style=\{\{ padding: '0\.2rem 0', marginBottom: '1rem' \}\}/g, ' className="admin-cms-page-header"'],
  [/ style=\{\{ display: 'flex', gap: '0\.25rem', borderBottom: '2px solid #ead7e8', marginBottom: '1\.5rem' \}\}/g, ' className="admin-cms-tab-row"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1\.5rem', alignItems: 'start' \}\}/g, ' className="admin-cms-sidebar-grid"'],
  [/ style=\{\{ fontSize: '0\.65rem', fontWeight: 800, color: '#ad246d', textTransform: 'uppercase', marginBottom: '0\.25rem' \}\}/g, ' className="admin-page-kicker"'],
  [/ style=\{\{ marginTop: '1rem', borderTop: '1px solid #f2ebf4', paddingTop: '1rem', display: 'grid', gap: '0\.75rem' \}\}/g, ' className="admin-cms-reset-section"'],
  [/ style=\{\{ padding: '0\.5rem', borderRadius: '10px', background: 'transparent', color: '#8c7895', border: '1\.5px solid #ead7e8', fontWeight: 700, fontSize: '0\.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0\.4rem' \}\}/g, ' className="admin-cms-reset-btn"'],
  [/ style=\{\{ fontSize: '0\.62rem', color: '#8c7895', marginTop: '0\.2rem' \}\}/g, ' className="admin-cms-note"'],
  [/ style=\{\{ fontSize: '1rem', fontWeight: 800, color: '#3b2e43', marginBottom: '1\.25rem' \}\}/g, ' className="admin-cms-section-title"'],
  [/ style=\{\{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem', marginBottom: '0\.75rem' \}\}/g, ' className="admin-cms-item-card"'],
  [/ style=\{\{ fontSize: '0\.7rem', fontWeight: 800, color: '#ad246d', marginBottom: '0\.5rem' \}\}/g, ' className="admin-cms-item-label"'],
  [/ style=\{\{ display: 'flex', gap: '0\.5rem', alignItems: 'center' \}\}/g, ' className="admin-cms-color-row"'],
  [/ style=\{\{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #ead7e8' \}\}/g, ' className="admin-cms-color-swatch"'],
];

let c = cms;
cmsFixes.forEach(([pat, rep]) => { c = c.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminCMS.tsx'), c);
const cLeft = (c.match(/style=\{\{/g)||[]).length;
console.log(`AdminCMS: ${cLeft} remaining`);

// ── AdminDashboard remaining ──
const dashFixes = [
  [/ style=\{\{\s*[^}]*\s*\}\}/g, (match) => {
    // just return empty to strip any remaining single-prop inline styles
    return '';
  }],
];
// More targeted for dashboard
const dashFixes2 = [
  [/ style=\{\{ fontSize: '1\.5rem', fontWeight: 900, margin: '0 0 0\.2rem 0' \}\}/g, ' className="admin-hero-title"'],
  [/ style=\{\{ color: '#8c7895', maxWidth: '500px', fontSize: '0\.8rem', margin: 0 \}\}/g, ' className="admin-hero-desc"'],
];
let d = dashboard;
dashFixes2.forEach(([pat, rep]) => { d = d.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminDashboard.tsx'), d);
const dLeft = (d.match(/style=\{\{/g)||[]).length;
console.log(`AdminDashboard: ${dLeft} remaining`);

// ── AdminEvents remaining ──
const eventsFixes = [
  [/ style=\{\{ padding: '0\.5rem 1\.25rem', borderRadius: '8px', background: '#ad246d', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0\.8rem', cursor: 'pointer', opacity: isSubmitting \? 0\.7 : 1 \}\}/g, ' className="admin-btn-primary"'],
  [/ style=\{\{ padding: '0\.5rem 1\.25rem', borderRadius: '8px', background: '#fff', color: '#ad246d', border: '1\.5px solid #ead7e8', fontWeight: 800, fontSize: '0\.8rem', cursor: 'pointer' \}\}/g, ' className="admin-btn-ghost"'],
];
let ev = events;
eventsFixes.forEach(([pat, rep]) => { ev = ev.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminEvents.tsx'), ev);
const evLeft = (ev.match(/style=\{\{/g)||[]).length;
console.log(`AdminEvents: ${evLeft} remaining`);

// ── AdminInventory remaining ──
const inventoryFixes = [
  [/ style=\{\{ borderBottom: '1px solid #ead7e8', paddingBottom: '0\.6rem', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0\.5rem' \}\}/g, ' className="admin-section-underline"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)', gap: '1rem' \}\}/g, ' className="admin-inv-summary-auto"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.75rem', color: '#8c7895' \}\}/g, ' className="admin-summary-label"'],
  [/ style=\{\{ fontSize: '1\.4rem', color: '#ad246d' \}\}/g, ' className="admin-val-pink-lg"'],
];
let inv = inventory;
inventoryFixes.forEach(([pat, rep]) => { inv = inv.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminInventory.tsx'), inv);
const invLeft = (inv.match(/style=\{\{/g)||[]).length;
console.log(`AdminInventory: ${invLeft} remaining`);

// ── AdminUserManagement remaining ──
const userFixes = [
  [/ style=\{\{ fontSize: '0\.75rem', fontWeight: 700 \}\}/g, ' className="admin-form-label-sm"'],
  [/ style=\{\{ width: '100%', padding: '0\.5rem', borderRadius: '8px', border: '1px solid #ead7e8' \}\}/g, ' className="admin-select"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0\.75rem' \}\}/g, ' className="admin-form-two-col-sm"'],
  [/ style=\{\{ \s*flex: 1,\s*padding: '0\.6rem 1rem',\s*borderRadius: '8px',\s*background: '#ad246d',\s*color: '#fff',\s*border: 'none',\s*fontWeight: 800,\s*fontSize: '0\.85rem',\s*cursor: 'pointer',\s*opacity: isSubmitting \? 0\.7 : 1\s*\}\}/gs, ' className="admin-modal-btn-primary"'],
  [/ style=\{\{ \s*flex: 1,\s*padding: '0\.6rem 1rem',\s*borderRadius: '8px',\s*background: '#fff',\s*color: '#ad246d',\s*border: '1\.5px solid #ead7e8',\s*fontWeight: 800,\s*fontSize: '0\.85rem',\s*cursor: 'pointer'\s*\}\}/gs, ' className="admin-modal-btn-ghost"'],
  // dynamic toggle button styles (keep them - they're conditional)
];
let um = userMgmt;
userFixes.forEach(([pat, rep]) => { um = um.replace(pat, rep); });
fs.writeFileSync(path.join(pagesDir, 'AdminUserManagement.tsx'), um);
const umLeft = (um.match(/style=\{\{/g)||[]).length;
console.log(`AdminUserManagement: ${umLeft} remaining`);

// Final summary
console.log('\n=== FINAL SUMMARY ===');
const files = ['AdminCMS.tsx','AdminDashboard.tsx','AdminEvents.tsx','AdminInventory.tsx','AdminReports.tsx','AdminUserManagement.tsx'];
files.forEach(f => {
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const n = (content.match(/style=\{\{/g)||[]).length;
  console.log(`${f}: ${n} remaining${n === 0 ? ' ✓' : ''}`);
});
