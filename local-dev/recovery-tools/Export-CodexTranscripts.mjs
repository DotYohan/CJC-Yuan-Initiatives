import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const [sessionsRoot, outputRoot] = process.argv.slice(2);
if (!sessionsRoot || !outputRoot) {
  console.error('Usage: node Export-CodexTranscripts.mjs <sessions-root> <output-root>');
  process.exit(2);
}
if (!fs.existsSync(sessionsRoot)) throw new Error(`Sessions directory not found: ${sessionsRoot}`);
if (fs.existsSync(outputRoot)) throw new Error(`Transcript output already exists: ${outputRoot}`);
fs.mkdirSync(outputRoot, { recursive: true });

function filesUnder(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(full));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) result.push(full);
  }
  return result.sort();
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    if (!part || typeof part !== 'object') return '';
    return part.text ?? part.input_text ?? part.output_text ?? '';
  }).filter(Boolean).join('\n');
}

const index = [];
for (const file of filesUnder(sessionsRoot)) {
  const relative = path.relative(sessionsRoot, file);
  const target = path.join(outputRoot, relative.replace(/\.jsonl$/i, '.md'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const output = fs.createWriteStream(target, { encoding: 'utf8', flags: 'wx' });
  output.write(`# Codex transcript\n\nRaw source: \`${relative.replaceAll('\\', '/')}\`\n\n`);
  let messages = 0;
  let timestamp = '';
  const input = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of input) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    timestamp = event.timestamp ?? event.created_at ?? timestamp;
    const payload = event.payload ?? event;
    const candidate = payload.type === 'message' ? payload : payload.message ?? payload.item ?? payload;
    const role = candidate?.role;
    if (!['user', 'assistant'].includes(role)) continue;
    const text = extractText(candidate.content ?? candidate.text);
    if (!text.trim()) continue;
    const time = event.timestamp ?? candidate.timestamp ?? '';
    output.write(`## ${role === 'user' ? 'User' : 'Assistant'}${time ? ` — ${time}` : ''}\n\n${text.trim()}\n\n`);
    messages += 1;
  }
  await new Promise((resolve, reject) => output.end((error) => error ? reject(error) : resolve()));
  index.push({ rawFile: relative.replaceAll('\\', '/'), transcriptFile: path.relative(outputRoot, target).replaceAll('\\', '/'), messages, lastTimestamp: timestamp });
}
fs.writeFileSync(path.join(outputRoot, 'index.json'), JSON.stringify(index, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
console.log(`Created ${index.length} readable transcript files.`);

