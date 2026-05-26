const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages';

// ── AdminCMS: Replace remaining specific ones ──
let cms = fs.readFileSync(path.join(pagesDir, 'AdminCMS.tsx'), 'utf8');

// L284: aside with spread ...card
cms = cms.replace(/ style=\{\{ \.\.\.card, padding: '1rem', display: 'grid', gap: '0\.5rem' \}\}/g, ' className="admin-card-rounded admin-cms-sidebar-aside"');
// L372,379: color picker rows
cms = cms.replace(/ style=\{\{ display: 'flex', gap: '10px', alignItems: 'center' \}\}/g, ' className="admin-cms-color-row"');
// L373,380: color input (square)
cms = cms.replace(/ style=\{\{ width: '40px', height: '40px', border: 'none', borderRadius: '4px' \}\}/g, ' className="admin-cms-color-picker"');
// L374,381: text input
cms = cms.replace(/ style=\{\{ flex: 1, padding: '0\.6rem', borderRadius: '10px', border: '1px solid #ead7e8' \}\}/g, ' className="admin-cms-color-text"');
// L385: margin top
cms = cms.replace(/ style=\{\{ marginTop: '1rem' \}\}/g, ' className="admin-cms-range-wrap"');
// L387: range input
cms = cms.replace(/ style=\{\{ width: '100%' \}\}/g, ' className="admin-cms-range"');
// L388: range label
cms = cms.replace(/ style=\{\{ fontSize: '0\.7rem', color: '#8c7895', textAlign: 'right' \}\}/g, ' className="admin-cms-range-value"');
// L396: font grid
cms = cms.replace(/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fill, minmax\(200px, 1fr\)\)', gap: '1\.5rem' \}\}/g, ' className="admin-cms-img-grid"');
// L398: img card
cms = cms.replace(/ style=\{\{ background: '#fdf7fb', border: '1px solid #f2ebf4', borderRadius: '12px', padding: '1rem' \}\}/g, ' className="admin-hair-col"');
// L399: label
cms = cms.replace(/ style=\{\{ display: 'block', fontSize: '0\.65rem', fontWeight: 800, color: '#8c7895', textTransform: 'uppercase', marginBottom: '8px' \}\}/g, ' className="admin-cms-field-label"');
// L402: image preview box
cms = cms.replace(/ style=\{\{ width: '100%', height: '100px', background: '#fff', borderRadius: '8px', border: '1px dashed #ead7e8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '10px' \}\}/g, ' className="admin-cms-img-preview"');
// L404: img
cms = cms.replace(/ style=\{\{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' \}\}/g, ' className="admin-cms-img-preview-img"');
// L406: placeholder icon
cms = cms.replace(/ style=\{\{ fontSize: '2rem', color: '#ead7e8' \}\}/g, ' className="admin-cms-img-placeholder-icon"');
// L413: hidden input
cms = cms.replace(/ style=\{\{ display: 'none' \}\}/g, ' className="admin-hidden"');
// L416: upload btn row
cms = cms.replace(/ style=\{\{ display: 'flex', gap: '8px' \}\}/g, ' className="admin-cms-upload-row"');
// L420: upload btn
cms = cms.replace(/ style=\{\{ flex: 1, padding: '0\.4rem', borderRadius: '6px', border: '1px solid #ad246d', background: 'transparent', color: '#ad246d', fontSize: '0\.7rem', fontWeight: 700, cursor: 'pointer' \}\}/g, ' className="admin-cms-upload-btn"');
// L426: clear btn
cms = cms.replace(/ style=\{\{ padding: '0\.4rem 0\.8rem', borderRadius: '6px', border: '1px solid #ead7e8', background: '#fdf7fb', color: '#8c7895', fontSize: '0\.7rem', fontWeight: 700, cursor: 'pointer' \}\}/g, ' className="admin-cms-clear-btn"');
// L441: font grid
cms = cms.replace(/ style=\{\{ display: 'grid', gap: '1\.5rem' \}\}/g, ' className="admin-cms-font-grid"');
// L447,457: select with font family (keep fontFamily dynamic, just add class)
cms = cms.replace(/ style=\{\{ width: '100%', padding: '0\.6rem', borderRadius: '10px', border: '1px solid #ead7e8', fontFamily: typography\.headingFont \}\}/g, ' className="admin-cms-font-select" style={{ fontFamily: typography.headingFont }}');
cms = cms.replace(/ style=\{\{ width: '100%', padding: '0\.6rem', borderRadius: '10px', border: '1px solid #ead7e8', fontFamily: typography\.bodyFont \}\}/g, ' className="admin-cms-font-select" style={{ fontFamily: typography.bodyFont }}');
// L449,459: option with font family (keep dynamic)
cms = cms.replace(/ style=\{\{ fontFamily: f \}\}/g, ' style={{ fontFamily: f }}'); // intentionally keep - dynamic
// L491,541: card headings  
cms = cms.replace(/ style=\{\{ fontSize: '0\.9rem', marginBottom: '1rem' \}\}/g, ' className="admin-cms-card-title"');

fs.writeFileSync(path.join(pagesDir, 'AdminCMS.tsx'), cms);
const cmsLeft = (cms.match(/style=\{\{/g)||[]).length;
console.log(`AdminCMS: ${cmsLeft} remaining (${cmsLeft <= 2 ? 'only dynamic font selects' : ''})`);

// ── AdminReports: remaining ──
let rep = fs.readFileSync(path.join(pagesDir, 'AdminReports.tsx'), 'utf8');
const repFixes = [
  [/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(3, 1fr\)', gap: '1rem' \}\}/g, ' className="admin-three-col-no-mb"'],
  [/ style=\{\{ background: '#fdf7fb', padding: '0\.8rem', borderRadius: '8px', border: '1px solid #ead7e8' \}\}/g, ' className="admin-report-mini-card"'],
  [/ style=\{\{ margin: '0 0 0\.4rem 0', fontSize: '0\.8rem' \}\}/g, ' className="admin-report-mini-title"'],
  [/ style=\{\{ display: 'flex', justifyContent: 'space-between', padding: '0\.25rem 0', borderBottom: '1px solid #f2ebf4', fontSize: '0\.7rem' \}\}/g, ' className="admin-report-mini-row"'],
  [/ style=\{\{ background: '#fdf7fb', padding: '1rem', borderRadius: '10px', border: '1px solid #ead7e8', textAlign: 'center' \}\}/g, ' className="admin-report-center-card"'],
  [/ style=\{\{ margin: '0 0 0\.5rem 0', fontSize: '0\.8rem' \}\}/g, ' className="admin-report-mini-title"'],
];
repFixes.forEach(([pat, r]) => { rep = rep.replace(pat, r); });
fs.writeFileSync(path.join(pagesDir, 'AdminReports.tsx'), rep);
const repLeft = (rep.match(/style=\{\{/g)||[]).length;
console.log(`AdminReports: ${repLeft} remaining`);

// ── AdminUserManagement: remaining dynamic buttons ──
let um = fs.readFileSync(path.join(pagesDir, 'AdminUserManagement.tsx'), 'utf8');
// The remaining 5 are the dynamic toggle button styles - convert to use ternary classNames
um = um.replace(
  /style=\{\{ \s*padding: '0\.35rem 0\.8rem', \s*fontSize: '0\.7rem',\s*background: user\.isActive \? '#fff' : '#ad246d',\s*border: `1\.5px solid \$\{user\.isActive \? '#ead7e8' : '#ad246d'\}`,\s*color: user\.isActive \? '#8c7895' : '#fff',\s*borderRadius: '8px',\s*fontWeight: 800,\s*cursor: 'pointer',\s*display: 'flex',\s*alignItems: 'center',\s*gap: '0\.35rem'\s*\}\}/gs,
  'className={`admin-user-toggle-btn ${user.isActive ? "deactivate" : "activate"}`}'
);
// fix inv-summary-grid remaining
um = um.replace(/ style=\{\{ display: 'grid', gridTemplateColumns: 'repeat\(auto-fit, minmax\(140px, 1fr\)\)', gap: '0\.75rem', margin: '0\.75rem 0' \}\}/g, ' className="admin-summary-grid"');
// fix admin-bar with extra styles
um = um.replace(/ style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0\.75rem' \}\}/g, ' className="admin-bar"');
// fix admin-tools
um = um.replace(/ style=\{\{ display: 'flex', gap: '0\.5rem' \}\}/g, ' className="admin-tools"');

fs.writeFileSync(path.join(pagesDir, 'AdminUserManagement.tsx'), um);
const umLeft = (um.match(/style=\{\{/g)||[]).length;
console.log(`AdminUserManagement: ${umLeft} remaining`);

// ── AdminDashboard: remaining 2 (hero section multiline) ──
let dash = fs.readFileSync(path.join(pagesDir, 'AdminDashboard.tsx'), 'utf8');
// Remove the multiline hero style
dash = dash.replace(/<header className="admin-hero admin-surface" style=\{\{[\s\S]*?\}\}>/g, '<header className="admin-hero admin-surface admin-hero-header">');
// Fix the Link style in dashboard
dash = dash.replace(/<Link to="\/admin\/reports" style=\{\{[\s\S]*?\}\}>/g, '<Link to="/admin/reports" className="admin-focus-link">');
fs.writeFileSync(path.join(pagesDir, 'AdminDashboard.tsx'), dash);
const dashLeft = (dash.match(/style=\{\{/g)||[]).length;
console.log(`AdminDashboard: ${dashLeft} remaining`);

// ── AdminEvents: remaining 2 (same btn patterns) ──
let ev = fs.readFileSync(path.join(pagesDir, 'AdminEvents.tsx'), 'utf8');
// Multi-line button styles
ev = ev.replace(/style=\{\{\s*padding: '0\.5rem 1\.25rem',\s*borderRadius: '8px',\s*background: '#ad246d',\s*color: '#fff',\s*border: 'none',\s*fontWeight: 800,\s*fontSize: '0\.8rem',\s*cursor: 'pointer',\s*opacity: isSubmitting \? 0\.7 : 1\s*\}\}/gs, 'className="admin-btn-primary"');
ev = ev.replace(/style=\{\{\s*padding: '0\.5rem 1\.25rem',\s*borderRadius: '8px',\s*background: '#fff',\s*color: '#ad246d',\s*border: '1\.5px solid #ead7e8',\s*fontWeight: 800,\s*fontSize: '0\.8rem',\s*cursor: 'pointer'\s*\}\}/gs, 'className="admin-btn-ghost"');
fs.writeFileSync(path.join(pagesDir, 'AdminEvents.tsx'), ev);
const evLeft = (ev.match(/style=\{\{/g)||[]).length;
console.log(`AdminEvents: ${evLeft} remaining`);

// ── AdminInventory: remaining 1 ──
let inv = fs.readFileSync(path.join(pagesDir, 'AdminInventory.tsx'), 'utf8');
inv = inv.replace(/ style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0\.75rem' \}\}/g, ' className="admin-bar"');
inv = inv.replace(/ style=\{\{ display: \"grid\", gridTemplateColumns: \"repeat\(auto-fit,minmax\(140px,1fr\)\)\", gap: \"0\.75rem\", margin: \"0\.75rem 0\" \}\}/g, ' className="admin-summary-grid"');
fs.writeFileSync(path.join(pagesDir, 'AdminInventory.tsx'), inv);
const invLeft = (inv.match(/style=\{\{/g)||[]).length;
console.log(`AdminInventory: ${invLeft} remaining`);

// Final check all 10
console.log('\n=== FINAL STATUS ===');
const all = [
  'AdminCMS.tsx','AdminCommunityModeration.tsx','AdminDashboard.tsx',
  'AdminEvents.tsx','AdminInventory.tsx','AdminMatching.tsx',
  'AdminOperations.tsx','AdminReports.tsx','AdminUserManagement.tsx','AdminVerification.tsx'
];
let totalLeft = 0;
all.forEach(f => {
  const n = (fs.readFileSync(path.join(pagesDir,f),'utf8').match(/style=\{\{/g)||[]).length;
  totalLeft += n;
  console.log(`  ${f}: ${n}${n===0?' ✓':` remaining`}`);
});
console.log(`\nTotal remaining: ${totalLeft}`);
