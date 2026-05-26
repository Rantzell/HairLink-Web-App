const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Merge double quoted classNames: className="a" className="b"
  let prev;
  do {
    prev = content;
    content = content.replace(/className="([^"]*)"\s+className="([^"]*)"/g, 'className="$1 $2"');
  } while (content !== prev);

  // 2. Merge Template Literal and string literal:
  //    className={`a ${expr}`} className="b"  -> className={`a ${expr} b`}
  //    className={`a`} className="b"           -> className={`a b`}
  do {
    prev = content;
    content = content.replace(/className=\{\s*`([\s\S]*?)`\s*\}\s+className="([^"]*)"/g, 'className={`$1 $2`}');
  } while (content !== prev);

  //    className="b" className={`a ${expr}`}  -> className={`b a ${expr}`}
  do {
    prev = content;
    content = content.replace(/className="([^"]*)"\s+className=\{\s*`([\s\S]*?)`\s*\}/g, 'className={`$1 $2`}');
  } while (content !== prev);

  // 3. Merge general expression and string literal:
  //    className={expr} className="b"  -> className={`${expr} b`}
  //    (if expression does not already start/end with template literal backticks)
  do {
    prev = content;
    // We match className={expr} where expr doesn't start with `
    content = content.replace(/className=\{\s*([^`{}]+?)\s*\}\s+className="([^"]*)"/g, 'className={`$1 $2`}');
  } while (content !== prev);

  //    className="b" className={expr}  -> className={`b ${expr}`}
  do {
    prev = content;
    content = content.replace(/className="([^"]*)"\s+className=\{\s*([^`{}]+?)\s*\}/g, 'className={`$1 $2`}');
  } while (content !== prev);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed duplicate classNames in: ${path.basename(filePath)}`);
  }
}

// Read all files in pages directory
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
  if (file.endsWith('.tsx')) {
    fixFile(path.join(pagesDir, file));
  }
});
