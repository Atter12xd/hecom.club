const fs = require("fs");
const path = require("path");
const vm = require("vm");
const file = path.join(__dirname, "..", "credito-app", "credito-app.js");
let s = fs.readFileSync(file, "utf8");

function check(label, src) {
  const i = src.lastIndexOf("export{");
  const toCheck = i >= 0 ? src.slice(0, i) : src;
  try {
    new vm.Script(toCheck, { filename: file });
    console.log("OK:", label);
    return true;
  } catch (e) {
    console.log("FAIL:", label, e.message);
    return false;
  }
}

const crAllRe =
  /,crAll=we\.useMemo\(\(\)=>\{const ut="",rt="";let F=Nt[\s\S]*?\},\[Nt,Pe,a,c,o,s\]\),vc=/;

let step = s;
check("0 original", step);

const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const bodyRep = 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

function strip(src, marker) {
  const a = src.indexOf(wrap);
  if (a < 0) return src;
  const b = src.indexOf(marker, a);
  if (b < 0) throw new Error("no marker");
  return src.slice(0, a) + src.slice(b);
}

step = strip(step, bodyDash);
check("A strip1 only original", step);

step = s;
if (crAllRe.test(step)) step = step.replace(crAllRe, ",vc=");
step = step.replace(
  /pie:Ce\}\},\[Nt,Pe,ut,rt,a,c,o,s\]\),\[Nt,Pe,a,c,o,s\]\),vc=/g,
  "pie:Ce}},[Nt,Pe,ut,rt,a,c,o,s]),vc="
);
check("1 after crAll+piefix", step);
step = strip(step, bodyDash);
check("2 after strip 1", step);
step = strip(step, bodyRep);
check("3 after strip 2", step);
