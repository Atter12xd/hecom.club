const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const m = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
let idx = 0;
let c = 0;
while (true) {
  const i = s.indexOf(m, idx);
  if (i < 0) break;
  c++;
  console.log(c, i);
  idx = i + 1;
}
