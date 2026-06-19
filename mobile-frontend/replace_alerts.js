const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.expo') && !dirFile.includes('assets')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const root = path.join(__dirname);
const files = walkSync(root);

let count = 0;

files.forEach(file => {
  if (file.includes('GlobalAlert.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (content.includes('Alert.alert')) {
    content = content.replace(/Alert\.alert\(/g, 'CustomAlert.alert(');
    
    let relativeDepth = path.relative(path.dirname(file), path.join(root, 'components')).replace(/\\/g, '/');
    let importPath = relativeDepth.startsWith('.') ? relativeDepth : './' + relativeDepth;
    
    if (!content.includes('import { CustomAlert } from')) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextNewline = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextNewline + 1) + "import { CustomAlert } from '" + importPath + "/GlobalAlert';\n" + content.slice(nextNewline + 1);
      } else {
        content = "import { CustomAlert } from '" + importPath + "/GlobalAlert';\n" + content;
      }
    }
    
    if (!content.includes('Alert.') && !content.includes('<Alert')) {
       content = content.replace(/,\s*Alert\b/g, '').replace(/\bAlert\s*,/g, '');
       content = content.replace(/import\s*\{\s*\}\s*from\s*['"]react-native['"];?\n?/g, '');
    }

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
    }
  }
});

console.log("Successfully replaced Alert.alert in " + count + " files.");
