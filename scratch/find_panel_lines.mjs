import fs from "fs";

const content = fs.readFileSync("portal.html", "utf8");
const lines = content.split("\n");

lines.forEach((line, index) => {
    if (line.includes("data-program-head-panel") ||
        line.includes("data-registrar-panel") ||
        line.includes("data-admin-panel") ||
        line.includes("data-monitoring-panel") ||
        line.includes("data-ssc-panel") ||
        line.includes("data-club-panel")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
