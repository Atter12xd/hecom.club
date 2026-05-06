const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
for (const needle of ["Todos", "todos", "Total", "hm-report-total", "crAll"]) {
  let idx = 0;
  let c = 0;
  console.log("\n===", needle, "===");
  while (c < 8) {
    const i = s.indexOf(needle, idx);
    if (i < 0) break;
    c++;
    console.log(i, JSON.stringify(s.slice(i - 40, i + needle.length + 80)));
    idx = i + 1;
  }
}
