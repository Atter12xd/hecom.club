const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
let idx = 0;
let n = 0;
while (true) {
  const i = s.indexOf("last_6", idx);
  if (i < 0) break;
  n++;
  console.log("\n---", n, "at", i);
  console.log(s.slice(i - 60, i + 120));
  idx = i + 1;
  if (n >= 25) break;
}
console.log("\ntotal last_6:", (s.match(/last_6/g) || []).length);
