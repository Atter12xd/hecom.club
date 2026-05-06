const fs = require("fs");
const vm = require("vm");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const a = s.indexOf(wrap);
const b = s.indexOf(bodyDash, a);
const out = s.slice(0, a) + s.slice(b);
console.log("junction at", a, "len removed", b - a);
console.log("around junction:");
console.log(JSON.stringify(out.slice(a - 80, a + 100)));

const i = out.lastIndexOf("export{");
try {
  new vm.Script(out.slice(0, i));
  console.log("syntax OK");
} catch (e) {
  console.log("syntax err", e.message);
}
