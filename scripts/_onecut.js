const fs = require("fs");
const vm = require("vm");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const spanKey = 'Do(rt)]}),';
const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const body1 = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const k = s.indexOf(spanKey + wrap);
const a = k + spanKey.length;
const b = s.indexOf(body1, a);
const ins = "]})".repeat(6) + "}),";
let t = s.slice(0, a) + ins + s.slice(b);
const i = t.lastIndexOf("export{");
try {
  new vm.Script(t.slice(0, i));
  console.log("OK");
} catch (e) {
  console.log(e.message);
  const j = a + ins.length;
  console.log("context", JSON.stringify(t.slice(j - 10, j + 60)));
}
