const fs = require('fs');

const path = 'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages/StaffRealtimeTracking.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove all occurrences of import '../styles/StaffRealtimeTracking.css';
content = content.replace(/import '\.\.\/styles\/StaffRealtimeTracking\.css';/g, '');

// Prepend it to the top
content = `import '../styles/StaffRealtimeTracking.css';\n` + content;

fs.writeFileSync(path, content);
console.log('Fixed StaffRealtimeTracking.tsx imports');
