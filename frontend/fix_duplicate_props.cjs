const fs = require('fs');

const filesToFix = [
  'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages/StaffMatching.tsx',
  'c:/Users/ACER/OneDrive - Far Eastern University/Desktop/HairLink-Web-App-1/frontend/src/pages/StaffRealtimeTracking.tsx'
];

for (const file of filesToFix) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Fix multiple className attributes: className="a" className="b" -> className="a b"
  // Wait, the regex for duplicate className might be tricky. Let's do a simple one:
  // We can just replace `className="([^"]*)"\s+className="([^"]*)"` with `className="$1 $2"`
  let oldContent = content;
  do {
    oldContent = content;
    content = content.replace(/className="([^"]*)"\s+className="([^"]*)"/g, 'className="$1 $2"');
  } while (oldContent !== content);

  do {
    oldContent = content;
    content = content.replace(/className=\{([^}]+)\}\s+className="([^"]*)"/g, 'className={`$1 $2`}');
  } while (oldContent !== content);

  do {
    oldContent = content;
    content = content.replace(/className="([^"]*)"\s+className=\{([^}]+)\}/g, 'className={`$1 $2`}');
  } while (oldContent !== content);

  fs.writeFileSync(file, content);
}

console.log('JSX duplicate class names fixed.');

