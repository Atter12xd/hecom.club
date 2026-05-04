const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const keys = [
  "Qce=",
  "function Qce",
  "all_time",
  "total",
  "Pf(",
  "function Pf",
  "presets",
  "this_month",
  "id:\"this_month\"",
];
for (const x of keys) {
  let i = 0;
  let n = 0;
  while ((i = s.indexOf(x, i)) !== -1 && n < 3) {
    console.log("---", x, "#" + n, "at", i);
    console.log(s.slice(i, i + 500).replace(/\n/g, " "));
    i += x.length;
    n++;
  }
}
