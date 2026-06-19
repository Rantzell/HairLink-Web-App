const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'screens', 'auth', 'SignupScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

let lines = content.split('\n');

// The lines are 0-indexed in array.
// Line 485 is index 484.
if (lines[484].includes('</View>')) {
    lines[484] = lines[484].replace('</View>', '</BlurView>');
}
if (lines[569].includes('</View>')) {
    lines[569] = lines[569].replace('</View>', '</BlurView>');
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed syntax!');
