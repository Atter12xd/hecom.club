const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);

const wrap =
  'h.jsxs("div",{className:"hm-report-total-wrap"';
const body =
  'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const body2 =
  'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

function midBetween(from, toLabel, toNeedle) {
  const a = s.indexOf(from);
  const b = s.indexOf(toNeedle, a);
  const mid = s.slice(a, b);
  console.log(toLabel, "len", mid.length);
  console.log("head", mid.slice(0, 280));
  console.log("tail", mid.slice(-280));
}

midBetween(wrap, "wrap1->body", body);
const a2 = s.indexOf(wrap, s.indexOf(wrap) + 1);
const b2 = s.indexOf(body2, a2);
console.log("\nwrap2->metricas len", s.slice(a2, b2).length);
console.log("tail2", s.slice(a2, b2).slice(-280));
