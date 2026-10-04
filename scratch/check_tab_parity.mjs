import fs from 'fs';

const html = fs.readFileSync('portal.html', 'utf8');

['data-student', 'data-ph', 'data-registrar', 'data-admin', 'data-club'].forEach(prefix => {
  const navRe = new RegExp('<[^>]+' + prefix + '-nav="([^"]+)"[^>]*>', 'g');
  const viewRe = new RegExp('<[^>]+' + prefix + '-view="([^"]+)"[^>]*>', 'g');
  const navs = [];
  const views = [];
  let m;
  while ((m = navRe.exec(html)) !== null) navs.push(m[1]);
  while ((m = viewRe.exec(html)) !== null) views.push(m[1]);
  console.log(`=== ${prefix} ===`);
  console.log(`Navs (${navs.length}):`, navs);
  console.log(`Views (${views.length}):`, views);
});
