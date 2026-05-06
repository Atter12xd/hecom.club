const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const k = s.indexOf('className:"hm-resumen-pro-layout"');
const seg = s.slice(k - 200, k + 12000);
console.log(seg);
