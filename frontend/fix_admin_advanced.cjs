const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

function fixTagClassNames(tagContent) {
  const classNameRegex = /className=(?:"([^"]*)"|'([^']*)'|\{([^}]+)\})/g;
  let matches = [];
  let match;
  while ((match = classNameRegex.exec(tagContent)) !== null) {
    matches.push({
      full: match[0],
      doubleQuote: match[1],
      singleQuote: match[2],
      braced: match[3],
      index: match.index
    });
  }

  if (matches.length <= 1) return tagContent;

  let staticClasses = [];
  let dynamicExpressions = [];

  for (const m of matches) {
    if (m.doubleQuote !== undefined) {
      staticClasses.push(m.doubleQuote);
    } else if (m.singleQuote !== undefined) {
      staticClasses.push(m.singleQuote);
    } else if (m.braced !== undefined) {
      const expr = m.braced.trim();
      if (expr.startsWith('`') && expr.endsWith('`')) {
        const inner = expr.slice(1, -1);
        dynamicExpressions.push(inner);
      } else {
        dynamicExpressions.push(`\${${expr}}`);
      }
    }
  }

  let mergedClassName = '';
  if (dynamicExpressions.length > 0) {
    const staticPart = staticClasses.filter(Boolean).join(' ');
    const dynamicPart = dynamicExpressions.join(' ');
    const combined = [staticPart, dynamicPart].filter(Boolean).join(' ').trim();
    mergedClassName = `className={\`${combined}\`}`;
  } else {
    const combined = staticClasses.filter(Boolean).join(' ').trim();
    mergedClassName = `className="${combined}"`;
  }

  let newTagContent = tagContent;
  matches.sort((a, b) => b.index - a.index);
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (i === matches.length - 1) {
      newTagContent = newTagContent.slice(0, m.index) + mergedClassName + newTagContent.slice(m.index + m.full.length);
    } else {
      let startIdx = m.index;
      while (startIdx > 0 && /\s/.test(newTagContent[startIdx - 1])) {
        startIdx--;
      }
      newTagContent = newTagContent.slice(0, startIdx) + newTagContent.slice(m.index + m.full.length);
    }
  }

  return newTagContent;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Regex to match JSX tags: e.g. <div ... > or <i ... >
  // We want to match from `<` to the matching `>` of the opening tag.
  // A simplified regex that doesn't cross tags:
  // We can find all text between < and > and if it contains className more than once, we process it.
  content = content.replace(/<[a-zA-Z0-9\-]+(?:\s+[^>]+)?>/g, (tag) => {
    if ((tag.match(/className=/g) || []).length > 1) {
      return fixTagClassNames(tag);
    }
    return tag;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed advanced duplicate classNames in: ${path.basename(filePath)}`);
  }
}

// Read all files in pages directory
const files = fs.readdirSync(pagesDir);
files.forEach(file => {
  if (file.endsWith('.tsx')) {
    fixFile(path.join(pagesDir, file));
  }
});
