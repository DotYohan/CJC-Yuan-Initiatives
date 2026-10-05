import fs from "fs";

const css = fs.readFileSync("portal.css", "utf8");
const lines = css.split("\n");

lines.forEach((line, index) => {
    if (line.includes(".student-forms-grid") ||
        line.includes(".student-dashboard-grid") ||
        line.includes(".dashboard-module") ||
        line.includes(".student-identity")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
