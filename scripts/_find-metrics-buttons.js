const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const anchor = 'children:"Ver últimos 6 meses"})}),h.jsxs("div",{style:{display:';
const i = s.indexOf(anchor);
console.log("anchor at", i);
if (i >= 0) {
  const seg = s.slice(i, i + 1800);
  console.log(seg);
}
