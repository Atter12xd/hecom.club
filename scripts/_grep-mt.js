const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const re = /\bMt[&=!]/g;
let m;
let count = 0;
while ((m = re.exec(s)) !== null) {
  count++;
  const i = m.index;
  console.log("\n---", count, i);
  console.log(s.slice(i - 50, i + 200));
  if (count >= 40) break;
}
console.log("\ntotal Mt& matches", count);
console.log("\ntotal Mt& matches", count);
