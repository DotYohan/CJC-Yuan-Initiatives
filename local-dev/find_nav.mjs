import fs from "fs";

const content = fs.readFileSync("portal.html", "utf8");
const lines = content.split("\n");
lines.forEach((l, idx) => {
  if (l.includes("<nav") || l.includes('role="tablist"') || l.includes("portal-nav") || l.includes("shell") || l.includes("-panel")) {
    console.log(idx + 1, l.slice(0, 100));
  }
});
