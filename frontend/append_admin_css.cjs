const fs = require('fs');
const cssPath = 'src/styles/Admin.css';
let css = fs.readFileSync(cssPath, 'utf8');

const newCSS = `
/* ── Missing from AdminOperations & others ── */
.admin-ops-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.admin-mini-stat {
  background: #fff;
  border: 1px solid #ead7e8;
  padding: 0.8rem;
  border-radius: 12px;
  text-align: center;
}

.admin-mini-stat-label {
  display: block;
  color: #8c7895;
  font-size: 0.6rem;
  text-transform: uppercase;
}

.admin-mini-stat-value {
  font-size: 1.2rem;
  color: #ad246d;
}

.admin-ops-card {
  background: #fff;
  border: 1px solid #ead7e8;
  border-radius: 16px;
  padding: 1rem;
  overflow: hidden;
}

.admin-ops-card-header {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f2ebf4;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.admin-ops-icon-wrap {
  background: #fdf7fb;
  padding: 0.4rem;
  border-radius: 8px;
  border: 1px solid #ead7e8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-ops-card-title {
  font-size: 0.85rem;
  font-weight: 800;
  margin: 0;
  color: #3b2e43;
}

.admin-td-muted {
  color: #8c7895;
}

.admin-empty-state {
  text-align: center;
  padding: 3rem;
  color: #8c7895;
}

.admin-icon-faded {
  font-size: 2rem;
  opacity: 0.3;
}

.admin-empty-title {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  font-weight: 800;
}

.admin-empty-subtitle {
  margin: 0.1rem 0 0;
  font-size: 0.7rem;
}

/* ── Status Pills ── */
.admin-status-pill {
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 800;
  display: inline-block;
}

.admin-status-pill-success,
.admin-status-pill-completed,
.admin-status-pill-received,
.admin-status-pill-matched {
  background: #ecfdf5;
  color: #059669;
}

.admin-status-pill-warning,
.admin-status-pill-inprogress,
.admin-status-pill-pending {
  background: #fff7ed;
  color: #ea580c;
}

.admin-status-pill-info,
.admin-status-pill-intransit,
.admin-status-pill-active {
  background: #eff6ff;
  color: #2563eb;
}

.admin-status-pill-default {
  background: #fdf7fb;
  color: #ad246d;
}
`;

if (!css.includes('.admin-ops-stat-grid')) {
  fs.appendFileSync(cssPath, '\n' + newCSS);
  console.log('Appended CSS to Admin.css');
} else {
  console.log('CSS already present');
}
