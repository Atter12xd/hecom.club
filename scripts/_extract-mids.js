const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const bodyRep = 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

let a = s.indexOf(wrap);
let b = s.indexOf(bodyDash, a);
console.log("mid1 len", b - a);
fs.writeFileSync(path.join(__dirname, "_mid1.txt"), s.slice(a, b));

a = s.indexOf(wrap, b);
b = s.indexOf(bodyRep, a);
console.log("mid2 len", b - a);
fs.writeFileSync(path.join(__dirname, "_mid2.txt"), s.slice(a, b));
