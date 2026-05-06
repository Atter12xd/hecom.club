const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const i = s.indexOf("Qce=()=>");
console.log("Qce at", i);
if (i >= 0) console.log(s.slice(i, i + 500));
const j = s.indexOf("pt=we.useMemo");
console.log("\npt=we.useMemo at", j);
if (j >= 0) console.log(s.slice(j, j + 900));
const k = s.indexOf('id:"last_6"');
console.log("\nlast_6 id at", k);
if (k >= 0) console.log(s.slice(k - 80, k + 200));
