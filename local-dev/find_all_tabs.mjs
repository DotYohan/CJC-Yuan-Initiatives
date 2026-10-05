import fs from 'fs';

const html = fs.readFileSync('portal.html', 'utf8');
const lines = html.split('\n');

lines.forEach((line, index) => {
  if (/data-(ph|registrar|admin|student|club)-(nav|view)/.test(line)) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
