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

const t = s.replace(mid1, mid1);
try {
  new vm.Script(t.slice(0, t.lastIndexOf("export{")));
  console.log("identity replace: OK");
} catch (e) {
  console.log("identity FAIL", e.message);
}
