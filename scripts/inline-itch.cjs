// Inlines JS and CSS into a single index.html for itch.io compatibility.
// itch.io serves files in subdirectories with wrong MIME types, so everything
// must be in the root or inlined.
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const outDir = path.join(__dirname, '..', 'dist-itch');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

// Read CSS and JS content
let cssContent = '';
let jsContent = '';

html = html.replace(/<link[^>]*href="\.\/([^"]+\.css)"[^>]*>/g, function(match, href) {
  cssContent = fs.readFileSync(path.join(distDir, href), 'utf-8');
  return '';
});

html = html.replace(/<script[^>]*src="\.\/([^"]+\.js)"[^>]*><\/script>/g, function(match, src) {
  jsContent = fs.readFileSync(path.join(distDir, src), 'utf-8');
  return '';
});

// Build the HTML manually to avoid any escaping issues
const parts = html.split('</head>');
const beforeHead = parts[0];
const afterHead = parts.slice(1).join('</head>');

const bodyParts = afterHead.split('</body>');
const beforeBody = bodyParts[0];
const afterBody = bodyParts.slice(1).join('</body>');

// Write file in pieces to avoid string escaping issues
const fd = fs.openSync(path.join(outDir, 'index.html'), 'w');
fs.writeSync(fd, beforeHead);
fs.writeSync(fd, '<style>');
fs.writeSync(fd, cssContent);
fs.writeSync(fd, '</style>\n</head>');
fs.writeSync(fd, beforeBody);
fs.writeSync(fd, '<script>');
fs.writeSync(fd, jsContent);
fs.writeSync(fd, '</script>\n</body>');
fs.writeSync(fd, afterBody);
fs.closeSync(fd);

// Copy non-asset files (audio etc) to root
for (const file of fs.readdirSync(distDir)) {
  if (file === 'index.html' || file === 'assets') continue;
  fs.copyFileSync(path.join(distDir, file), path.join(outDir, file));
  console.log('Copied ' + file);
}

const stat = fs.statSync(path.join(outDir, 'index.html'));
console.log('Created dist-itch/index.html (' + Math.round(stat.size / 1024) + ' KB)');
