import fs from 'fs';

const pages = [
  { html: 'portal.html', css: ['portal.css'] },
  { html: 'index.html', css: ['style.css'] },
  { html: 'signup.html', css: ['style.css', 'signup.css'] },
  { html: 'reset-password.html', css: ['portal.css'] }
];

for (const p of pages) {
  const html = fs.readFileSync(p.html, 'utf8');
  let combinedCss = '';
  for (const c of p.css) {
    if (fs.existsSync(c)) combinedCss += fs.readFileSync(c, 'utf8') + '\n';
  }

  const classes = new Set();
  const regex = /class=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(c => {
      if (c) classes.add(c);
    });
  }

  const missing = [];
  classes.forEach(c => {
    // Check if class exists in CSS as .className (or as partial if hyphenated)
    const escaped = c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const classRegex = new RegExp('\\.' + escaped + '(?=[\\s\\.,:;>\\[\\]{()]|$)', 'm');
    if (!classRegex.test(combinedCss) && !['hidden', 'active'].includes(c)) {
      missing.push(c);
    }
  });

  console.log(`\n=== ${p.html} (CSS: ${p.css.join(', ')}) ===`);
  console.log('Total classes in HTML:', classes.size);
  console.log('Missing classes count:', missing.length);
  if (missing.length) {
    console.log('Missing classes:', missing);
  }
}
