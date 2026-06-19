const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'screens', 'auth', 'SignupScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Lighten background gradient
content = content.replace(
    /colors=\{\['#0F0510', '#1F0B18', '#380E28'\]\}/g,
    "colors={['#FAFAF9', '#FFF0F8', '#FFEBF5']}"
);

// 2. Change BlurView tint to light
content = content.replace(
    /tint="dark"/g,
    'tint="light"'
);
content = content.replace(
    /intensity=\{40\}/g,
    'intensity={60}'
);

// 3. Ambient lights opacity
content = content.replace(
    /opacity: 0\.6/g,
    'opacity: 1'
);
content = content.replace(
    /opacity: 0\.3/g,
    'opacity: 0.15'
);
content = content.replace(
    /opacity: 0\.2/g,
    'opacity: 0.1'
);

// 4. Update Input Boxes for light mode
content = content.replace(
    /backgroundColor: 'rgba\(255, 255, 255, 0\.05\)'/g,
    "backgroundColor: 'rgba(255, 255, 255, 0.6)'"
);
content = content.replace(
    /borderColor: 'rgba\(255, 255, 255, 0\.1\)'/g,
    "borderColor: 'rgba(232, 99, 161, 0.2)'"
);
content = content.replace(
    /borderColor: 'rgba\(255, 255, 255, 0\.15\)'/g,
    "borderColor: 'rgba(255, 255, 255, 0.5)'"
);
content = content.replace(
    /color: '#FFF'/g,
    "color: '#1a1a1a'"
);
content = content.replace(
    /placeholderTextColor="rgba\(255,255,255,0\.5\)"/g,
    'placeholderTextColor="#A8A29E"'
);

// 5. Gender Picker Border
content = content.replace(
    /borderColor: "rgba\(255,255,255,0\.1\)"/g,
    'borderColor: "rgba(255, 255, 255, 0.5)"'
);

// 6. Role Cards & other specific elements
content = content.replace(
    /backgroundColor: 'rgba\(214, 59, 138, 0\.15\)'/g,
    "backgroundColor: 'rgba(255, 255, 255, 0.8)'"
);

// 7. Change back button background to be light translucent
content = content.replace(
    /backgroundColor: 'rgba\(255, 255, 255, 0\.1\)'/g,
    "backgroundColor: 'rgba(0, 0, 0, 0.05)'"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated SignupScreen.tsx to light mode');
