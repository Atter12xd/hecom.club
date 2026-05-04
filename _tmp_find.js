const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const keys = [
  "hm-report-total",
  "hmTotPan",
  "last_6",
  "Ver últimos",
  "Pendiente neto",
  "hmSetTotPan",
  "hm-report-period",
];
for (const x of keys) {
  const i = s.indexOf(x);
  console.log("---", x, i);
  if (i >= 0) console.log(s.slice(Math.max(0, i - 100), i + 400).replace(/\n/g, " "));
}
