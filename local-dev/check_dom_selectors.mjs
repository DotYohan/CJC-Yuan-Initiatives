import fs from "fs";

const html = fs.readFileSync("portal.html", "utf8");
const js = fs.readFileSync("portal.js", "utf8");

// Extract all select("...") or selectAll("...") from portal.js
const selectRegex = /select(?:All)?\(\s*["']([^"']+)["']/g;
let match;
const selectors = new Set();
while ((match = selectRegex.exec(js)) !== null) {
  selectors.add(match[1]);
}

console.log(`Found ${selectors.size} distinct selectors in portal.js`);

const missing = [];
for (const sel of selectors) {
  // Simple check for classes, ids, attributes
  if (sel.startsWith("#")) {
    const id = sel.slice(1);
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
      missing.push(sel);
    }
  } else if (sel.startsWith("[data-") && sel.endsWith("]")) {
    const attr = sel.slice(1, -1);
    if (!html.includes(attr)) {
      missing.push(sel);
    }
  } else if (sel.startsWith(".")) {
    const cls = sel.slice(1).split(/[ :.]/)[0];
    if (!html.includes(`class="`) || !html.includes(cls)) {
      missing.push(sel);
    }
  }
}

console.log("Potentially missing selectors:", missing);
