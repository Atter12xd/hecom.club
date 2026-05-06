const fs = require("fs");
const vm = require("vm");
let s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);

const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const w1 = s.indexOf(wrap);
const b1 = s.indexOf(bodyDash, w1);
const mid1 = s.slice(w1, b1);

const t = s.replace(mid1, "");
console.log("at w1 (should be start of body):", JSON.stringify(t.slice(w1, w1 + 120)));
console.log("before w1:", JSON.stringify(t.slice(w1 - 80, w1)));

console.log("mid parts count", s.split(mid1).length);
