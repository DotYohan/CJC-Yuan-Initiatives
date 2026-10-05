import fs from "fs";

const css = fs.readFileSync("portal.css", "utf8");
const lines = css.split("\n");

lines.forEach((line, index) => {
    if (line.includes("workspace-tab") || line.includes("workspace-tabs")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
