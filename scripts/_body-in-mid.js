const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const w1 = s.indexOf(wrap);
const b1 = s.indexOf(bodyDash, w1);
const mid1 = s.slice(w1, b1);
console.log("bodyDash inside mid1?", mid1.includes(bodyDash));
console.log("idx", mid1.indexOf("hm-resumen-pro-body"));
