const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const wrap = s.indexOf('h.jsxs("div",{className:"hm-report-total-wrap"');
const body = s.indexOf('h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"');
const body2 = s.indexOf('h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"');
console.log({ wrap, body, body2, bodyInsideWrap: wrap < body });
