const fs = require("fs");
const head = fs.readFileSync("_head_app.js", "utf8");
const cur = fs.readFileSync("credito-app/credito-app.js", "utf8");
const spanEnd = 'Do(rt)]}),';
const a = head.indexOf(spanEnd + 'h.jsxs("div",{className:"hm-report-total-wrap"');
const b = head.indexOf('h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"', a);
const closings = head.slice(a + spanEnd.length, b);
console.log("closings len", closings.length);
console.log(JSON.stringify(closings.slice(0, 120)));
console.log(JSON.stringify(closings.slice(-80)));

const bad1 =
  'children:[Kt," · ",Do(ut)," – ",Do(rt)]}),]})]})]})]})]})}),h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const good1 =
  'children:[Kt," · ",Do(ut)," – ",Do(rt)]}),' + closings + 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
if (!cur.includes(bad1)) {
  console.error("bad1 not found");
} else {
  let fixed = cur.replace(bad1, good1);
  const bad2 =
    'children:[Kt," · ",Do(ut)," – ",Do(rt)]}),]})]})]})]})]}),h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';
  const a2 = head.indexOf(spanEnd + 'h.jsxs("div",{className:"hm-report-total-wrap"', b + 100);
  const b2 = head.indexOf('h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"', a2);
  const closings2 = head.slice(a2 + spanEnd.length, b2);
  console.log("closings2", JSON.stringify(closings2.slice(-40)));
  const good2 =
    'children:[Kt," · ",Do(ut)," – ",Do(rt)]}),' + closings2 + 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';
  if (!fixed.includes(bad2)) console.error("bad2 not found");
  else fixed = fixed.replace(bad2, good2);
  fs.writeFileSync("credito-app/credito-app.js", fixed);
  console.log("written");
}
