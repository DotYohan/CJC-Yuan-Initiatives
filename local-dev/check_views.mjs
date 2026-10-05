import fs from 'fs';

const html = fs.readFileSync('portal.html', 'utf8');

['data-student-view', 'data-ph-view', 'data-registrar-view', 'data-admin-view', 'data-club-view'].forEach(attr => {
  const re = new RegExp('<[^>]+' + attr + '="([^"]+)"[^>]*>', 'g');
  let match;
  console.log('=== ' + attr + ' ===');
  while ((match = re.exec(html)) !== null) {
    console.log(match[0]);
  }
});
