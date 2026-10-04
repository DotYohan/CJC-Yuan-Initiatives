import fs from "fs";

const logPath = 'C:/Users/yohan/.gemini/antigravity-ide/brain/52f580aa-54d0-4c7a-a20b-d4d613e06b55/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

const editsByStep = {};
for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if ([3532, 3536, 3540, 3681, 3685, 3689, 3953, 3961, 3971].includes(obj.step_index)) {
      editsByStep[obj.step_index] = obj.tool_calls?.[0]?.args;
    }
  } catch (e) {}
}

function applyEdit(filePath, args, step) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Normalize line endings for replacement
  const target = args.TargetContent.replace(/\r\n/g, '\n');
  const replacement = args.ReplacementContent.replace(/\r\n/g, '\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');

  if (!normalizedContent.includes(target)) {
    console.error(`FAILED to find target content for step ${step} in ${filePath}`);
    // Check if partial match exists
    const firstLine = target.split('\n')[0];
    console.error(`First line was: ${firstLine}`);
    return false;
  }

  const updated = normalizedContent.replace(target, replacement);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Successfully applied step ${step} to ${filePath}`);
  return true;
}

console.log("--- APPLYING PORTAL.CSS EDITS ---");
for (const step of [3532, 3536, 3540, 3953, 3961]) {
  const args = editsByStep[step];
  if (!args) {
    console.error(`Missing args for step ${step}`);
    continue;
  }
  applyEdit('portal.css', args, step);
}

console.log("\n--- APPLYING PORTAL.JS EDITS ---");
for (const step of [3681, 3685, 3689, 3971]) {
  const args = editsByStep[step];
  if (!args) {
    console.error(`Missing args for step ${step}`);
    continue;
  }
  applyEdit('portal.js', args, step);
}
