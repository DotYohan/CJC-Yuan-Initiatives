import fs from "fs";

const content = fs.readFileSync("portal.html", "utf8");
const attrs = [
    "data-student-nav", "data-student-view",
    "data-admin-nav", "data-admin-view",
    "data-registrar-nav", "data-registrar-view",
    "data-ph-nav", "data-ph-view",
    "data-faculty-nav", "data-faculty-view",
    "data-club-nav", "data-club-view",
    "data-ssc-nav", "data-ssc-view"
];

for (const attr of attrs) {
    const regex = new RegExp(`${attr}="([^"]*)"`, "g");
    const matches = [...content.matchAll(regex)].map(m => m[1]);
    console.log(attr, matches);
}
