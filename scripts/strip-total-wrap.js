const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "credito-app", "credito-app.js");

function check(src) {
  const i = src.lastIndexOf("export{");
  const toCheck = i >= 0 ? src.slice(0, i) : src;
  try {
    new (require("vm").Script)(toCheck, { filename: file });
    return true;
  } catch (e) {
    return e.message;
  }
}

const spanKey = 'Do(rt)]}),';
const wrapStart = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const body1 = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const body2 = 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

const suffixes = [];
for (let n = 2; n <= 9; n++) {
  suffixes.push("]})".repeat(n) + "}),");
  suffixes.push("]})".repeat(n) + "]}),");
}

function applyBoth(s, ins1, ins2) {
  const k1 = s.indexOf(spanKey + wrapStart);
  if (k1 < 0) return null;
  const a1 = k1 + spanKey.length;
  const b1 = s.indexOf(body1, a1);
  if (b1 < 0) return null;
  let t = s.slice(0, a1) + ins1 + s.slice(b1);
  const k2 = t.indexOf(spanKey + wrapStart);
  if (k2 < 0) return null;
  const a2 = k2 + spanKey.length;
  const b2 = t.indexOf(body2, a2);
  if (b2 < 0) return null;
  t = t.slice(0, a2) + ins2 + t.slice(b2);
  return t;
}

const base = fs.readFileSync(file, "utf8");
let winner = null;
for (const ins1 of suffixes) {
  for (const ins2 of suffixes) {
    const t = applyBoth(base, ins1, ins2);
    if (!t) continue;
    if (check(t) === true) {
      winner = { ins1, ins2, t };
      break;
    }
  }
  if (winner) break;
}

if (!winner) {
  console.error("no (ins1,ins2) pair worked");
  process.exit(1);
}
console.log("OK", JSON.stringify(winner.ins1), JSON.stringify(winner.ins2));
fs.writeFileSync(file, winner.t);
console.log("written");
