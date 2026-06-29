const fs = require('fs');
const path = require('path');

function replaceBehavior(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceBehavior(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Replace single quotes
            const target1 = "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}";
            const replacement1 = "behavior={Platform.OS === 'ios' ? 'padding' : undefined}";
            if (content.includes(target1)) {
                content = content.split(target1).join(replacement1);
                modified = true;
            }

            // Replace double quotes
            const target2 = 'behavior={Platform.OS === "ios" ? "padding" : "height"}';
            const replacement2 = 'behavior={Platform.OS === "ios" ? "padding" : undefined}';
            if (content.includes(target2)) {
                content = content.split(target2).join(replacement2);
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated: ' + fullPath);
            }
        }
    }
}

replaceBehavior(path.join(__dirname, 'screens'));
