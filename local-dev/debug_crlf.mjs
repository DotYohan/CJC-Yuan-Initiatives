import fs from "fs";

const html = fs.readFileSync("portal.html", "utf8");

// The file uses CRLF (\r\n). The comparison string in the script was using \n only.
// Let's verify by checking CRLF
console.log("Has CRLF in student nav area:", html.includes('Dashboard Overview</button>\r\n'));
console.log("Has LF in student nav area:", html.includes('Dashboard Overview</button>\n'));

// Show the exact bytes around the nav to see how it looks
const idx = html.indexOf('<nav class="workspace-tabs" role="tablist" aria-label="Student Navigation">');
const chunk = html.substring(idx - 20, idx + 600);
console.log("\nExact bytes around student nav:");
for (let i = 0; i < chunk.length; i++) {
    if (chunk.charCodeAt(i) === 13) process.stdout.write('[CR]');
    else if (chunk.charCodeAt(i) === 10) process.stdout.write('[LF]\n');
    else process.stdout.write(chunk[i]);
}
