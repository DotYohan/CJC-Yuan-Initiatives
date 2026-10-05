import fs from 'fs';
const content = fs.readFileSync('portal.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
    if (l.includes('class="shell') || l.includes('data-admin-panel') || l.includes('data-student-dashboard') || l.includes('data-program-head-panel') || l.includes('data-faculty-panel') || l.includes('data-registrar-panel')) {
        console.log((idx + 1) + ': ' + l.trim());
    }
});
