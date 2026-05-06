const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
for (const n of [
  "last_6",
  "all_history",
  "Qce=",
  'label:"Total"',
  "hm-resumen-pro-body",
  "xe===",
  "weeklyMonthYM",
]) {
  console.log(n, (s.match(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length);
}
