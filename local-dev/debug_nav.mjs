import fs from "fs";

const html = fs.readFileSync("portal.html", "utf8");
// Find the exact old nav block - check what's actually in the file
const idx = html.indexOf('data-student-nav="overview"');
if (idx === -1) { console.log("no student nav found"); }
else {
    console.log("Context around student nav:");
    console.log(JSON.stringify(html.substring(idx - 200, idx + 400)));
}
