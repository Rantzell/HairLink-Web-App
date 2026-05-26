const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

// Common pattern across Inventory, UserMgmt, Dashboard, Events
const commonFixes = [
  // inv-summary-grid variants
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(140px, 1fr\)\)', gap: '0\.75rem', margin: '0\.75rem 0' \}\}/g, ' style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", margin: "0.75rem 0" }}'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(180px, 1fr\)\)', gap: '0\.75rem', margin: '0\.75rem 0' \}\}/g, ' style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem", margin: "0.75rem 0" }}'],
  
  // inv-summary-item compact
  [/ style=\{\{ background: '#fff', border: '1px solid #ead7e8', borderRadius: '12px', padding: '0\.75rem', textAlign: 'center' \}\}/g, ' className="admin-mini-stat"'],
  [/ style=\{\{ display: 'block', fontSize: '0\.65rem', color: '#8c7895', fontWeight: 700, textTransform: 'uppercase' \}\}/g, ' className="admin-mini-stat-label"'],
  [/ style=\{\{ fontSize: '1\.3rem', color: '#ad246d' \}\}/g, ' className="admin-mini-stat-value"'],
  
  // headers with flex variants
  [/ style=\{\{ padding: '0\.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' \}\}/g, ' className="admin-report-header-row"'],
  [/ style=\{\{ padding: '0\.2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' \}\}/g, ' className="admin-report-header-row"'],
  
  // admin-bar with display:flex gap
  [/ style=\{\{ display: 'flex', gap: '0\.5rem' \}\}/g, ' className="admin-tools"'],
  
  // role badge / chip size modifiers - just add class, keep inline for the dynamic part
  [/ style=\{\{ fontSize: '0\.65rem', padding: '0\.2rem 0\.5rem' \}\}/g, ' className="admin-chip-sm"'],
];

const allFiles = [
  'AdminCMS.tsx', 'AdminDashboard.tsx', 'AdminEvents.tsx',
  'AdminInventory.tsx', 'AdminReports.tsx', 'AdminUserManagement.tsx'
];

allFiles.forEach(fileName => {
  const filePath = path.join(pagesDir, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  commonFixes.forEach(([pat, rep]) => { content = content.replace(pat, rep); });
  fs.writeFileSync(filePath, content);
  const left = (content.match(/style=\{\{/g)||[]).length;
  console.log(`${fileName}: ${left} remaining`);
});

// Now handle AdminReports large report doc styles more aggressively
let rep = fs.readFileSync(path.join(pagesDir, 'AdminReports.tsx'), 'utf8');
const repFixes2 = [
  [/ style=\{\{ marginBottom: '2rem' \}\}/g, ' className="admin-report-section"'],
  [/ style=\{\{ marginBottom: '1\.5rem' \}\}/g, ' className="admin-section-head-mb"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' \}\}/g, ' className="admin-two-col-grid-2rem"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(2, 1fr\)', gap: '1\.5rem' \}\}/g, ' className="admin-report-two-col"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(4, 1fr\)', gap: '1rem', textAlign: 'center' \}\}/g, ' className="admin-four-col-grid"'],
  [/ style=\{\{ margin: 0, fontSize: '1\.2rem', fontWeight: 800 \}\}/g, ' className="admin-section-title"'],
  [/ style=\{\{ width: '100%', borderCollapse: 'collapse', fontSize: '0\.65rem' \}\}/g, ' className="admin-report-table"'],
  [/ style=\{\{ textAlign: 'left', padding: '0\.4rem', borderBottom: '1px solid #ead7e8' \}\}/g, ' className="admin-report-th"'],
  [/ style=\{\{ padding: '0\.4rem', borderBottom: '1px solid #f2ebf4' \}\}/g, ' className="admin-report-td"'],
  [/ style=\{\{ margin: 0 \}\}/g, ' className="admin-report-m0"'],
  [/ style=\{\{ margin: '0\.2rem 0', color: '#8c7895', fontSize: '0\.85rem' \}\}/g, ' className="admin-report-doc-subtitle"'],
  [/ style=\{\{ textAlign: 'right' \}\}/g, ' className="admin-report-right"'],
];
repFixes2.forEach(([pat, rep2]) => { rep = rep.replace(pat, rep2); });
fs.writeFileSync(path.join(pagesDir, 'AdminReports.tsx'), rep);
const repLeft = (rep.match(/style=\{\{/g)||[]).length;
console.log(`AdminReports after extra pass: ${repLeft} remaining`);

// Handle AdminCMS style={card} variable usage - convert to className
let c = fs.readFileSync(path.join(pagesDir, 'AdminCMS.tsx'), 'utf8');
// Remove const card = {...} variable and replace style={card} with className
c = c.replace(/\bconst card\s*=\s*\{[^}]+\};?\s*/g, '');
c = c.replace(/ style=\{card\}/g, ' className="admin-card-rounded"');
// Fix remaining
const cmsFixes2 = [
  [/ style=\{\{ display: 'flex', gap: '0\.25rem', borderBottom: '2px solid #ead7e8', marginBottom: '1\.5rem' \}\}/g, ' className="admin-cms-tab-row"'],
  [/ style=\{\{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1\.5rem', alignItems: 'start' \}\}/g, ' className="admin-cms-sidebar-grid"'],
  [/ style=\{\{ marginBottom: '0\.5rem', marginTop: '1rem' \}\}/g, ' className="admin-cms-heading-top"'],
];
cmsFixes2.forEach(([pat, rep2]) => { c = c.replace(pat, rep2); });
fs.writeFileSync(path.join(pagesDir, 'AdminCMS.tsx'), c);
const cLeft = (c.match(/style=\{\{/g)||[]).length;
console.log(`AdminCMS after extra pass: ${cLeft} remaining`);

// Final check
console.log('\n=== ALL FILES FINAL ===');
const adminFiles = [
  'AdminCMS.tsx','AdminCommunityModeration.tsx','AdminDashboard.tsx',
  'AdminEvents.tsx','AdminInventory.tsx','AdminMatching.tsx',
  'AdminOperations.tsx','AdminReports.tsx','AdminUserManagement.tsx','AdminVerification.tsx'
];
adminFiles.forEach(f => {
  const content = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const n = (content.match(/style=\{\{/g)||[]).length;
  console.log(`  ${f}: ${n}${n === 0 ? ' ✓' : ' remaining'}`);
});
