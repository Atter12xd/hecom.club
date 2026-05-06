const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const w = s.indexOf(wrap);
console.log("120 chars before wrap start:");
console.log(JSON.stringify(s.slice(w - 120, w)));
