const fs = require("fs");
let s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);

const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const w1 = s.indexOf(wrap);
const b1 = s.indexOf(bodyDash, w1);
const mid1 = s.slice(w1, b1);

const t = s.replace(mid1, "null,");
const i = t.lastIndexOf("export{");
try {
  new Function(t.slice(0, i));
  console.log("Function(): OK");
} catch (e) {
  console.log("Function(): FAIL", e.message);
}
