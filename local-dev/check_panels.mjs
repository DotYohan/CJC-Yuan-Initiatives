import fs from "fs";

const content = fs.readFileSync("portal.html", "utf8");
const panels = [...content.matchAll(/data-([a-z-]+-panel)/g)].map(m => m[1]);
console.log("Panels:", [...new Set(panels)]);

const sections = [...content.matchAll(/<section[^>]*class="([^"]*)"[^>]*>/g)].map(m => m[1]);
console.log("Sections:", sections);
